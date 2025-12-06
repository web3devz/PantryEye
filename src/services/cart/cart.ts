/**
 * Cart Service for PantryEye
 * Builds and manages shopping carts with user preferences
 * Requirements: 6.1, 6.2, 6.3, 6.4, 7.5, 8.1, 8.2
 */

import type {
  RestockItem,
  DraftCart,
  CartItem,
  UserMetadata,
  SubstituteOption,
  OrderConfirmation,
  CatalogItem,
} from '../../types';
import { SandboxClient } from '../sandbox/sandbox';
import { storageService } from '../storage/storage';
import { STORES } from '../db/schema';

/**
 * CartService class
 * Handles cart building, preference application, and order submission
 */
export class CartService {
  private sandboxClient: SandboxClient;

  constructor(sandboxClient?: SandboxClient) {
    this.sandboxClient = sandboxClient || new SandboxClient();
  }

  /**
   * Build draft cart from restock items
   * Requirements: 6.1, 6.2, 6.3, 6.4
   * 
   * @param restockItems - Items that need restocking
   * @param userMetadata - User preferences and constraints
   * @returns Draft cart with selected products
   */
  async buildDraftCart(
    restockItems: RestockItem[],
    userMetadata: UserMetadata
  ): Promise<DraftCart> {
    // Requirement 6.3: Determine vendor from allowlist
    const vendor = this.selectVendor(userMetadata.vendorAllowlist);

    const cartItems: CartItem[] = [];
    const explanations = new Map<string, string>();
    let totalPrice = 0;

    // Process each restock item
    for (const restockItem of restockItems) {
      console.log(`[CartService] Processing restock item: ${restockItem.sku.name}`);
      
      // Requirement 6.4: Query marketplace catalog
      const catalogItems = await this.findProductsForSKU(
        restockItem.sku.name,
        restockItem.sku.category,
        vendor
      );

      console.log(`[CartService] Found ${catalogItems.length} catalog items for ${restockItem.sku.name}`);

      if (catalogItems.length === 0) {
        // No products found - skip this item
        console.warn(`[CartService] No products found for ${restockItem.sku.name}, skipping`);
        continue;
      }

      // Requirement 6.2: Apply brand preferences
      const selectedProduct = this.selectProductWithPreferences(
        catalogItems,
        restockItem.sku.category,
        userMetadata.brandPreferences
      );

      // Calculate quantity needed (round up to ensure we don't run out)
      const quantityNeeded = Math.ceil(
        restockItem.velocity * (restockItem.daysUntilRunout + 7) // Add 7 days buffer
      );

      // Create cart item
      const cartItem: CartItem = {
        sku: restockItem.sku,
        marketplaceProductId: selectedProduct.productId,
        quantity: Math.max(1, quantityNeeded), // At least 1
        price: selectedProduct.price,
        brand: selectedProduct.brand,
        isSubstitute: false,
      };

      // Requirement 6.3: Check spending cap before adding
      const itemTotal = cartItem.price * cartItem.quantity;
      if (userMetadata.spendingCap && totalPrice + itemTotal > userMetadata.spendingCap) {
        // Would exceed spending cap - skip this item
        continue;
      }

      cartItems.push(cartItem);
      totalPrice += itemTotal;

      // Requirement 7.1: Create explanation
      const explanation = this.createItemExplanation(
        restockItem,
        selectedProduct,
        userMetadata.brandPreferences
      );
      explanations.set(restockItem.sku.id, explanation);
    }

    return {
      items: cartItems,
      totalPrice,
      vendor,
      explanations,
    };
  }

  /**
   * Apply user preferences to cart
   * Requirement 6.2: Apply brand preferences
   * 
   * @param cart - Draft cart to apply preferences to
   * @param preferences - User preferences
   * @returns Updated cart with preferences applied
   */
  async applyPreferences(
    cart: DraftCart,
    preferences: UserMetadata
  ): Promise<DraftCart> {
    const updatedItems: CartItem[] = [];
    let totalPrice = 0;

    for (const item of cart.items) {
      // Query catalog for alternatives
      const catalogItems = await this.findProductsForSKU(
        item.sku.name,
        item.sku.category,
        cart.vendor
      );

      // Select product with preferences
      const selectedProduct = this.selectProductWithPreferences(
        catalogItems,
        item.sku.category,
        preferences.brandPreferences
      );

      // Update cart item
      const updatedItem: CartItem = {
        ...item,
        marketplaceProductId: selectedProduct.productId,
        price: selectedProduct.price,
        brand: selectedProduct.brand,
      };

      const itemTotal = updatedItem.price * updatedItem.quantity;

      // Check spending cap
      if (preferences.spendingCap && totalPrice + itemTotal > preferences.spendingCap) {
        continue;
      }

      updatedItems.push(updatedItem);
      totalPrice += itemTotal;

      // Update explanation
      cart.explanations.set(
        item.sku.id,
        `${item.sku.name} — ${selectedProduct.brand} selected based on preferences`
      );
    }

    return {
      ...cart,
      items: updatedItems,
      totalPrice,
    };
  }

  /**
   * Get substitute options for out-of-stock item
   * Requirement 6.5: Generate substitute rankings
   * 
   * @param sku - SKU to find substitutes for
   * @param vendor - Vendor to search
   * @returns Array of substitute options ranked by suitability
   */
  async getSubstitutes(sku: any, vendor: string): Promise<SubstituteOption[]> {
    // Query catalog for similar items
    const catalogItems = await this.findProductsForSKU(
      sku.name,
      sku.category,
      vendor
    );

    // Filter to only in-stock items
    const inStockItems = catalogItems.filter((item) => item.inStock);

    // Convert to substitute options with ranking
    const substitutes: SubstituteOption[] = inStockItems.map((item, index) => ({
      sku,
      marketplaceProductId: item.productId,
      brand: item.brand,
      price: item.price,
      ranking: inStockItems.length - index, // Higher ranking for earlier items
    }));

    // Sort by ranking (highest first)
    substitutes.sort((a, b) => b.ranking - a.ranking);

    return substitutes;
  }

  /**
   * Submit approved cart to sandbox API
   * Requirements: 7.5, 8.1, 8.2
   * 
   * @param cart - Approved draft cart
   * @returns Order confirmation
   */
  async submitOrder(cart: DraftCart): Promise<OrderConfirmation> {
    // Requirement 7.5: Call sandbox API to place order
    const orderConfirmation = await this.sandboxClient.placeOrder(cart, cart.vendor);

    // Requirement 8.1, 8.2: Store order confirmation in encrypted storage
    await storageService.store(STORES.ORDER, orderConfirmation.orderId, orderConfirmation);

    // Requirement 8.1: Create audit log entry
    await storageService.appendAuditLog({
      timestamp: new Date(),
      type: 'order_placed',
      data: {
        orderId: orderConfirmation.orderId,
        vendor: orderConfirmation.vendor,
        itemCount: orderConfirmation.items.length,
        totalPrice: orderConfirmation.totalPrice,
        source: 'cart_service',
      },
      source: 'cart_service',
    });

    return orderConfirmation;
  }

  /**
   * Select vendor from allowlist
   * Defaults to first vendor in allowlist, or 'amazon' if empty
   * 
   * @param vendorAllowlist - List of allowed vendors
   * @returns Selected vendor
   */
  private selectVendor(vendorAllowlist: string[]): string {
    if (vendorAllowlist.length === 0) {
      return 'amazon';
    }
    return vendorAllowlist[0];
  }

  /**
   * Find products in marketplace catalog for a SKU
   * Requirement 6.4: Query marketplace catalog
   * 
   * @param skuName - Name of the SKU
   * @param category - Category of the SKU
   * @param vendor - Vendor to search
   * @returns Array of matching catalog items
   */
  private async findProductsForSKU(
    skuName: string,
    category: string,
    vendor: string
  ): Promise<CatalogItem[]> {
    try {
      console.log(`[CartService] Searching catalog for: "${skuName}", category: "${category}", vendor: "${vendor}"`);
      
      // Search by SKU name
      const results = await this.sandboxClient.searchCatalog(skuName, vendor);
      
      console.log(`[CartService] Sandbox returned ${results.length} results`);

      // Filter by category if available and we have multiple results
      if (category && results.length > 1) {
        const filtered = results.filter((item) => item.category === category);
        console.log(`[CartService] After category filter: ${filtered.length} results`);
        
        // If filtering removed all results, return unfiltered (better than nothing)
        if (filtered.length === 0) {
          console.log(`[CartService] Category filter removed all results, using unfiltered`);
          return results;
        }
        
        return filtered;
      }

      return results;
    } catch (error) {
      console.error(`[CartService] Error searching catalog for ${skuName}:`, error);
      return [];
    }
  }

  /**
   * Select product from catalog items based on brand preferences
   * Requirement 6.2: Apply brand preferences
   * 
   * @param catalogItems - Available catalog items
   * @param category - Product category
   * @param brandPreferences - User brand preferences by category
   * @returns Selected catalog item
   */
  private selectProductWithPreferences(
    catalogItems: CatalogItem[],
    category: string,
    brandPreferences: Map<string, string[]> | Record<string, string[]>
  ): CatalogItem {
    // Filter to in-stock items only
    const inStockItems = catalogItems.filter((item) => item.inStock);

    if (inStockItems.length === 0) {
      // All out of stock - return first item (will need substitute approval)
      return catalogItems[0];
    }

    // Get preferred brands for this category
    // Handle both Map and plain object (IndexedDB converts Maps to objects)
    let preferredBrands: string[] = [];
    if (brandPreferences instanceof Map) {
      preferredBrands = brandPreferences.get(category) || [];
    } else if (brandPreferences && typeof brandPreferences === 'object') {
      preferredBrands = (brandPreferences as Record<string, string[]>)[category] || [];
    }

    // Try to find preferred brand
    for (const preferredBrand of preferredBrands) {
      const match = inStockItems.find(
        (item) => item.brand.toLowerCase() === preferredBrand.toLowerCase()
      );
      if (match) {
        return match;
      }
    }

    // No preferred brand found - return first in-stock item
    return inStockItems[0];
  }

  /**
   * Create explanation for why an item was added to cart
   * Requirement 7.1, 7.2: Provide explanations for cart items
   * 
   * @param restockItem - Item being restocked
   * @param selectedProduct - Selected product from catalog
   * @param brandPreferences - User brand preferences
   * @returns Explanation string
   */
  private createItemExplanation(
    restockItem: RestockItem,
    selectedProduct: CatalogItem,
    brandPreferences: Map<string, string[]> | Record<string, string[]>
  ): string {
    const daysText = Math.round(restockItem.daysUntilRunout);
    const runoutText = daysText === 1 ? '1 day' : `${daysText} days`;

    // Check if selected brand is preferred
    // Handle both Map and plain object (IndexedDB converts Maps to objects)
    let preferredBrands: string[] = [];
    if (brandPreferences instanceof Map) {
      preferredBrands = brandPreferences.get(restockItem.sku.category) || [];
    } else if (brandPreferences && typeof brandPreferences === 'object') {
      preferredBrands = (brandPreferences as Record<string, string[]>)[restockItem.sku.category] || [];
    }

    const isPreferred = preferredBrands.some(
      (brand) => brand.toLowerCase() === selectedProduct.brand.toLowerCase()
    );

    let explanation = `${restockItem.sku.name} — predicted run-out in ${runoutText}`;

    if (isPreferred) {
      explanation += `, ${selectedProduct.brand} selected (preferred brand)`;
    } else {
      explanation += `, ${selectedProduct.brand} selected (best available)`;
    }

    return explanation;
  }
}

// Singleton instance
export const cartService = new CartService();
