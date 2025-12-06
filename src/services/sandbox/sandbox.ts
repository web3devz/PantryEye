/**
 * Sandbox API Client for marketplace integration
 * Requirements: 6.4, 7.5, 8.1, 12.3
 * 
 * This is a mock implementation that simulates Amazon/Walmart sandbox APIs
 * for testing and development purposes.
 */

import type {
  CatalogItem,
  DraftCart,
  OrderConfirmation,
  OrderStatus,
} from '../../types';

/**
 * Mock product catalog data
 */
const MOCK_CATALOG: CatalogItem[] = [
  // Dairy
  {
    productId: 'AMZ-MILK-001',
    name: 'Organic Whole Milk',
    brand: 'Horizon',
    price: 5.99,
    inStock: true,
    category: 'dairy',
  },
  {
    productId: 'AMZ-MILK-002',
    name: 'Whole Milk',
    brand: 'Great Value',
    price: 3.99,
    inStock: true,
    category: 'dairy',
  },
  {
    productId: 'WMT-MILK-001',
    name: 'Organic Milk',
    brand: 'Organic Valley',
    price: 6.49,
    inStock: true,
    category: 'dairy',
  },
  // Eggs
  {
    productId: 'AMZ-EGGS-001',
    name: 'Large Eggs',
    brand: 'Eggland\'s Best',
    price: 4.99,
    inStock: true,
    category: 'dairy',
  },
  {
    productId: 'AMZ-EGGS-002',
    name: 'Organic Large Eggs',
    brand: 'Vital Farms',
    price: 7.99,
    inStock: true,
    category: 'dairy',
  },
  {
    productId: 'WMT-EGGS-001',
    name: 'Large White Eggs',
    brand: 'Great Value',
    price: 3.49,
    inStock: true,
    category: 'dairy',
  },
  // Bread
  {
    productId: 'AMZ-BREAD-001',
    name: 'Whole Wheat Bread',
    brand: 'Dave\'s Killer Bread',
    price: 5.49,
    inStock: true,
    category: 'bakery',
  },
  {
    productId: 'AMZ-BREAD-002',
    name: 'White Bread',
    brand: 'Wonder Bread',
    price: 2.99,
    inStock: true,
    category: 'bakery',
  },
  {
    productId: 'WMT-BREAD-001',
    name: 'Whole Grain Bread',
    brand: 'Nature\'s Own',
    price: 3.99,
    inStock: true,
    category: 'bakery',
  },
  // Produce
  {
    productId: 'AMZ-APPLE-001',
    name: 'Gala Apples',
    brand: 'Fresh',
    price: 4.99,
    inStock: true,
    category: 'produce',
  },
  {
    productId: 'WMT-APPLE-001',
    name: 'Honeycrisp Apples',
    brand: 'Fresh',
    price: 5.99,
    inStock: true,
    category: 'produce',
  },
  {
    productId: 'AMZ-BANANA-001',
    name: 'Bananas',
    brand: 'Fresh',
    price: 1.99,
    inStock: true,
    category: 'produce',
  },
  // Pantry
  {
    productId: 'AMZ-PASTA-001',
    name: 'Spaghetti',
    brand: 'Barilla',
    price: 2.49,
    inStock: true,
    category: 'pantry',
  },
  {
    productId: 'WMT-PASTA-001',
    name: 'Penne Pasta',
    brand: 'Great Value',
    price: 1.49,
    inStock: true,
    category: 'pantry',
  },
  {
    productId: 'AMZ-RICE-001',
    name: 'White Rice',
    brand: 'Minute Rice',
    price: 3.99,
    inStock: true,
    category: 'pantry',
  },
  // Out of stock items for testing
  {
    productId: 'AMZ-MILK-003',
    name: 'Lactose-Free Milk',
    brand: 'Lactaid',
    price: 6.99,
    inStock: false,
    category: 'dairy',
  },
];

/**
 * Mock order storage
 */
const mockOrders = new Map<string, OrderConfirmation & { status: OrderStatus['status'] }>();

/**
 * SandboxClient class for marketplace integration
 */
export class SandboxClient {
  private simulateNetworkDelay: boolean;
  private networkDelayMs: number;

  constructor(options: { simulateNetworkDelay?: boolean; networkDelayMs?: number } = {}) {
    this.simulateNetworkDelay = options.simulateNetworkDelay ?? true;
    this.networkDelayMs = options.networkDelayMs ?? 100;
  }

  /**
   * Simulate network delay for realistic testing
   */
  private async delay(): Promise<void> {
    if (this.simulateNetworkDelay) {
      await new Promise((resolve) => setTimeout(resolve, this.networkDelayMs));
    }
  }

  /**
   * Search marketplace catalog
   * Requirement 6.4: Query marketplace catalog to find matching products
   */
  async searchCatalog(query: string, vendor: string): Promise<CatalogItem[]> {
    await this.delay();

    // Validate vendor
    if (!['amazon', 'walmart'].includes(vendor.toLowerCase())) {
      throw new Error(`Invalid vendor: ${vendor}. Must be 'amazon' or 'walmart'`);
    }

    // Normalize query for searching
    const normalizedQuery = query.toLowerCase().trim();

    // Filter catalog by vendor and query
    const vendorPrefix = vendor.toLowerCase() === 'amazon' ? 'AMZ' : 'WMT';
    
    const results = MOCK_CATALOG.filter((item) => {
      const matchesVendor = item.productId.startsWith(vendorPrefix);
      const matchesQuery =
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.brand.toLowerCase().includes(normalizedQuery) ||
        item.category.toLowerCase().includes(normalizedQuery);
      
      return matchesVendor && matchesQuery;
    });

    // If no results found, generate a generic product for the query
    // This ensures cart building doesn't fail for items not in mock catalog
    if (results.length === 0) {
      console.log(`[SandboxClient] No catalog match for "${query}", generating generic product`);
      
      // Try to infer category from query
      let category = 'general';
      const queryLower = normalizedQuery;
      if (queryLower.includes('milk') || queryLower.includes('egg') || queryLower.includes('cheese') || queryLower.includes('yogurt')) {
        category = 'dairy';
      } else if (queryLower.includes('bread') || queryLower.includes('bagel') || queryLower.includes('muffin')) {
        category = 'bakery';
      } else if (queryLower.includes('apple') || queryLower.includes('banana') || queryLower.includes('orange') || queryLower.includes('vegetable')) {
        category = 'produce';
      } else if (queryLower.includes('pasta') || queryLower.includes('rice') || queryLower.includes('cereal') || queryLower.includes('flour')) {
        category = 'pantry';
      }
      
      const genericProduct: CatalogItem = {
        productId: `${vendorPrefix}-GEN-${Date.now()}`,
        name: query,
        brand: 'Generic',
        price: 9.99,
        inStock: true,
        category,
      };
      return [genericProduct];
    }

    return results;
  }

  /**
   * Get product details by ID
   * Requirement 6.4: Retrieve specific product information
   */
  async getProduct(productId: string, vendor: string): Promise<CatalogItem> {
    await this.delay();

    // Validate vendor
    if (!['amazon', 'walmart'].includes(vendor.toLowerCase())) {
      throw new Error(`Invalid vendor: ${vendor}. Must be 'amazon' or 'walmart'`);
    }

    // Handle generic products (dynamically generated)
    if (productId.includes('-GEN-')) {
      console.log(`[SandboxClient] Returning generic product for: ${productId}`);
      return {
        productId,
        name: 'Generic Product',
        brand: 'Generic',
        price: 9.99,
        inStock: true,
        category: 'general',
      };
    }

    // Find product in catalog
    const product = MOCK_CATALOG.find((item) => item.productId === productId);

    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    // Verify product belongs to requested vendor
    const vendorPrefix = vendor.toLowerCase() === 'amazon' ? 'AMZ' : 'WMT';
    if (!product.productId.startsWith(vendorPrefix)) {
      throw new Error(`Product ${productId} not available from vendor ${vendor}`);
    }

    return product;
  }

  /**
   * Place order in sandbox
   * Requirements: 7.5, 8.1
   */
  async placeOrder(cart: DraftCart, vendor: string): Promise<OrderConfirmation> {
    await this.delay();

    // Validate vendor
    if (!['amazon', 'walmart'].includes(vendor.toLowerCase())) {
      throw new Error(`Invalid vendor: ${vendor}. Must be 'amazon' or 'walmart'`);
    }

    // Validate cart has items
    if (!cart.items || cart.items.length === 0) {
      throw new Error('Cannot place order: cart is empty');
    }

    // Verify all items are in stock
    for (const cartItem of cart.items) {
      // Skip validation for generic products (they're dynamically generated)
      if (cartItem.marketplaceProductId.includes('-GEN-')) {
        console.log(`[SandboxClient] Skipping validation for generic product: ${cartItem.marketplaceProductId}`);
        continue;
      }

      const product = MOCK_CATALOG.find((p) => p.productId === cartItem.marketplaceProductId);
      if (!product) {
        throw new Error(`Product not found: ${cartItem.marketplaceProductId}`);
      }
      if (!product.inStock) {
        throw new Error(`Product out of stock: ${product.name}`);
      }
    }

    // Generate order ID
    const orderId = `ORD-${vendor.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate estimated delivery (3-5 days from now)
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + Math.floor(Math.random() * 3) + 3);

    // Create order confirmation
    const orderConfirmation: OrderConfirmation = {
      orderId,
      vendor,
      items: cart.items,
      totalPrice: cart.totalPrice,
      estimatedDelivery,
      timestamp: new Date(),
    };

    // Store order in mock storage
    mockOrders.set(orderId, {
      ...orderConfirmation,
      status: 'pending',
    });

    return orderConfirmation;
  }

  /**
   * Get order status
   * Requirement 8.1: Track order status
   */
  async getOrderStatus(orderId: string, vendor: string): Promise<OrderStatus> {
    await this.delay();

    // Validate vendor
    if (!['amazon', 'walmart'].includes(vendor.toLowerCase())) {
      throw new Error(`Invalid vendor: ${vendor}. Must be 'amazon' or 'walmart'`);
    }

    // Find order
    const order = mockOrders.get(orderId);

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Verify order belongs to requested vendor
    if (order.vendor.toLowerCase() !== vendor.toLowerCase()) {
      throw new Error(`Order ${orderId} not found for vendor ${vendor}`);
    }

    // Simulate order progression based on time elapsed
    const now = new Date();
    const orderAge = now.getTime() - order.timestamp.getTime();
    const hoursElapsed = orderAge / (1000 * 60 * 60);

    let status: OrderStatus['status'] = 'pending';
    if (hoursElapsed > 48) {
      status = 'delivered';
    } else if (hoursElapsed > 24) {
      status = 'shipped';
    } else if (hoursElapsed > 1) {
      status = 'confirmed';
    }

    // Update stored order status
    order.status = status;

    return {
      orderId,
      status,
      lastUpdated: new Date(),
    };
  }

  /**
   * Simulate network timeout error
   * Requirement 12.3: Handle network timeouts
   */
  async simulateTimeout(): Promise<never> {
    await this.delay();
    throw new Error('Network timeout: Request took too long to complete');
  }

  /**
   * Clear mock order storage (for testing)
   */
  static clearMockOrders(): void {
    mockOrders.clear();
  }

  /**
   * Get mock catalog (for testing)
   */
  static getMockCatalog(): CatalogItem[] {
    return [...MOCK_CATALOG];
  }
}
