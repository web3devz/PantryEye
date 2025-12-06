/**
 * Unit tests for SandboxClient
 * Requirements: 6.4, 7.5, 8.1, 12.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SandboxClient } from './sandbox';
import type { DraftCart, CartItem, SKU } from '../../types';

describe('SandboxClient', () => {
  let client: SandboxClient;

  beforeEach(() => {
    // Create client without network delay for faster tests
    client = new SandboxClient({ simulateNetworkDelay: false });
    // Clear mock orders before each test
    SandboxClient.clearMockOrders();
  });

  describe('searchCatalog', () => {
    it('should search catalog by product name', async () => {
      const results = await client.searchCatalog('milk', 'amazon');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((item) => item.productId.startsWith('AMZ'))).toBe(true);
      expect(results.some((item) => item.name.toLowerCase().includes('milk'))).toBe(true);
    });

    it('should search catalog by brand', async () => {
      const results = await client.searchCatalog('horizon', 'amazon');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((item) => item.brand.toLowerCase().includes('horizon'))).toBe(true);
    });

    it('should search catalog by category', async () => {
      const results = await client.searchCatalog('dairy', 'amazon');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((item) => item.category === 'dairy')).toBe(true);
    });

    it('should filter results by vendor (amazon)', async () => {
      const results = await client.searchCatalog('milk', 'amazon');
      
      expect(results.every((item) => item.productId.startsWith('AMZ'))).toBe(true);
    });

    it('should filter results by vendor (walmart)', async () => {
      const results = await client.searchCatalog('milk', 'walmart');
      
      expect(results.every((item) => item.productId.startsWith('WMT'))).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const results = await client.searchCatalog('nonexistent-product-xyz', 'amazon');
      
      expect(results).toEqual([]);
    });

    it('should throw error for invalid vendor', async () => {
      await expect(client.searchCatalog('milk', 'invalid-vendor')).rejects.toThrow(
        'Invalid vendor'
      );
    });

    it('should handle case-insensitive search', async () => {
      const results1 = await client.searchCatalog('MILK', 'amazon');
      const results2 = await client.searchCatalog('milk', 'amazon');
      
      expect(results1.length).toBe(results2.length);
    });
  });

  describe('getProduct', () => {
    it('should retrieve product by ID', async () => {
      const product = await client.getProduct('AMZ-MILK-001', 'amazon');
      
      expect(product).toBeDefined();
      expect(product.productId).toBe('AMZ-MILK-001');
      expect(product.name).toBe('Organic Whole Milk');
      expect(product.brand).toBe('Horizon');
      expect(product.price).toBe(5.99);
      expect(product.inStock).toBe(true);
      expect(product.category).toBe('dairy');
    });

    it('should throw error for non-existent product', async () => {
      await expect(client.getProduct('INVALID-ID', 'amazon')).rejects.toThrow(
        'Product not found'
      );
    });

    it('should throw error for invalid vendor', async () => {
      await expect(client.getProduct('AMZ-MILK-001', 'invalid-vendor')).rejects.toThrow(
        'Invalid vendor'
      );
    });

    it('should throw error when product does not belong to vendor', async () => {
      await expect(client.getProduct('AMZ-MILK-001', 'walmart')).rejects.toThrow(
        'not available from vendor'
      );
    });

    it('should retrieve out-of-stock products', async () => {
      const product = await client.getProduct('AMZ-MILK-003', 'amazon');
      
      expect(product.inStock).toBe(false);
    });
  });

  describe('placeOrder', () => {
    it('should place order successfully', async () => {
      const mockSKU: SKU = {
        id: 'milk-001',
        name: 'Milk',
        category: 'dairy',
        unit: 'gallon',
        marketplaceIds: new Map([['amazon', 'AMZ-MILK-001']]),
      };

      const cartItem: CartItem = {
        sku: mockSKU,
        marketplaceProductId: 'AMZ-MILK-001',
        quantity: 2,
        price: 5.99,
        brand: 'Horizon',
        isSubstitute: false,
      };

      const cart: DraftCart = {
        items: [cartItem],
        totalPrice: 11.98,
        vendor: 'amazon',
        explanations: new Map([['milk-001', 'Predicted run-out in 3 days']]),
      };

      const confirmation = await client.placeOrder(cart, 'amazon');
      
      expect(confirmation).toBeDefined();
      expect(confirmation.orderId).toMatch(/^ORD-AMAZON-/);
      expect(confirmation.vendor).toBe('amazon');
      expect(confirmation.items).toEqual(cart.items);
      expect(confirmation.totalPrice).toBe(11.98);
      expect(confirmation.estimatedDelivery).toBeInstanceOf(Date);
      expect(confirmation.timestamp).toBeInstanceOf(Date);
      
      // Verify estimated delivery is 3-5 days in future
      const now = new Date();
      const deliveryDate = confirmation.estimatedDelivery;
      const daysDiff = Math.floor((deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeGreaterThanOrEqual(3);
      expect(daysDiff).toBeLessThanOrEqual(5);
    });

    it('should place order with multiple items', async () => {
      const mockSKU1: SKU = {
        id: 'milk-001',
        name: 'Milk',
        category: 'dairy',
        unit: 'gallon',
        marketplaceIds: new Map([['amazon', 'AMZ-MILK-001']]),
      };

      const mockSKU2: SKU = {
        id: 'eggs-001',
        name: 'Eggs',
        category: 'dairy',
        unit: 'dozen',
        marketplaceIds: new Map([['amazon', 'AMZ-EGGS-001']]),
      };

      const cart: DraftCart = {
        items: [
          {
            sku: mockSKU1,
            marketplaceProductId: 'AMZ-MILK-001',
            quantity: 1,
            price: 5.99,
            brand: 'Horizon',
            isSubstitute: false,
          },
          {
            sku: mockSKU2,
            marketplaceProductId: 'AMZ-EGGS-001',
            quantity: 2,
            price: 4.99,
            brand: "Eggland's Best",
            isSubstitute: false,
          },
        ],
        totalPrice: 15.97,
        vendor: 'amazon',
        explanations: new Map(),
      };

      const confirmation = await client.placeOrder(cart, 'amazon');
      
      expect(confirmation.items.length).toBe(2);
      expect(confirmation.totalPrice).toBe(15.97);
    });

    it('should throw error for empty cart', async () => {
      const emptyCart: DraftCart = {
        items: [],
        totalPrice: 0,
        vendor: 'amazon',
        explanations: new Map(),
      };

      await expect(client.placeOrder(emptyCart, 'amazon')).rejects.toThrow(
        'cart is empty'
      );
    });

    it('should throw error for invalid vendor', async () => {
      const mockSKU: SKU = {
        id: 'milk-001',
        name: 'Milk',
        category: 'dairy',
        unit: 'gallon',
        marketplaceIds: new Map([['amazon', 'AMZ-MILK-001']]),
      };

      const cart: DraftCart = {
        items: [
          {
            sku: mockSKU,
            marketplaceProductId: 'AMZ-MILK-001',
            quantity: 1,
            price: 5.99,
            brand: 'Horizon',
            isSubstitute: false,
          },
        ],
        totalPrice: 5.99,
        vendor: 'amazon',
        explanations: new Map(),
      };

      await expect(client.placeOrder(cart, 'invalid-vendor')).rejects.toThrow(
        'Invalid vendor'
      );
    });

    it('should throw error for non-existent product', async () => {
      const mockSKU: SKU = {
        id: 'fake-001',
        name: 'Fake Product',
        category: 'fake',
        unit: 'count',
        marketplaceIds: new Map([['amazon', 'INVALID-PRODUCT']]),
      };

      const cart: DraftCart = {
        items: [
          {
            sku: mockSKU,
            marketplaceProductId: 'INVALID-PRODUCT',
            quantity: 1,
            price: 9.99,
            brand: 'Fake',
            isSubstitute: false,
          },
        ],
        totalPrice: 9.99,
        vendor: 'amazon',
        explanations: new Map(),
      };

      await expect(client.placeOrder(cart, 'amazon')).rejects.toThrow(
        'Product not found'
      );
    });

    it('should throw error for out-of-stock product', async () => {
      const mockSKU: SKU = {
        id: 'milk-003',
        name: 'Lactose-Free Milk',
        category: 'dairy',
        unit: 'gallon',
        marketplaceIds: new Map([['amazon', 'AMZ-MILK-003']]),
      };

      const cart: DraftCart = {
        items: [
          {
            sku: mockSKU,
            marketplaceProductId: 'AMZ-MILK-003',
            quantity: 1,
            price: 6.99,
            brand: 'Lactaid',
            isSubstitute: false,
          },
        ],
        totalPrice: 6.99,
        vendor: 'amazon',
        explanations: new Map(),
      };

      await expect(client.placeOrder(cart, 'amazon')).rejects.toThrow(
        'out of stock'
      );
    });
  });

  describe('getOrderStatus', () => {
    it('should retrieve order status for pending order', async () => {
      // First place an order
      const mockSKU: SKU = {
        id: 'milk-001',
        name: 'Milk',
        category: 'dairy',
        unit: 'gallon',
        marketplaceIds: new Map([['amazon', 'AMZ-MILK-001']]),
      };

      const cart: DraftCart = {
        items: [
          {
            sku: mockSKU,
            marketplaceProductId: 'AMZ-MILK-001',
            quantity: 1,
            price: 5.99,
            brand: 'Horizon',
            isSubstitute: false,
          },
        ],
        totalPrice: 5.99,
        vendor: 'amazon',
        explanations: new Map(),
      };

      const confirmation = await client.placeOrder(cart, 'amazon');
      
      // Get order status
      const status = await client.getOrderStatus(confirmation.orderId, 'amazon');
      
      expect(status).toBeDefined();
      expect(status.orderId).toBe(confirmation.orderId);
      expect(status.status).toBe('pending');
      expect(status.lastUpdated).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent order', async () => {
      await expect(client.getOrderStatus('INVALID-ORDER-ID', 'amazon')).rejects.toThrow(
        'Order not found'
      );
    });

    it('should throw error for invalid vendor', async () => {
      await expect(client.getOrderStatus('ORD-AMAZON-123', 'invalid-vendor')).rejects.toThrow(
        'Invalid vendor'
      );
    });

    it('should throw error when order does not belong to vendor', async () => {
      // Place order with amazon
      const mockSKU: SKU = {
        id: 'milk-001',
        name: 'Milk',
        category: 'dairy',
        unit: 'gallon',
        marketplaceIds: new Map([['amazon', 'AMZ-MILK-001']]),
      };

      const cart: DraftCart = {
        items: [
          {
            sku: mockSKU,
            marketplaceProductId: 'AMZ-MILK-001',
            quantity: 1,
            price: 5.99,
            brand: 'Horizon',
            isSubstitute: false,
          },
        ],
        totalPrice: 5.99,
        vendor: 'amazon',
        explanations: new Map(),
      };

      const confirmation = await client.placeOrder(cart, 'amazon');
      
      // Try to get status with walmart
      await expect(client.getOrderStatus(confirmation.orderId, 'walmart')).rejects.toThrow(
        'not found for vendor'
      );
    });
  });

  describe('error handling', () => {
    it('should handle network timeout simulation', async () => {
      await expect(client.simulateTimeout()).rejects.toThrow('Network timeout');
    });
  });

  describe('static methods', () => {
    it('should provide access to mock catalog', () => {
      const catalog = SandboxClient.getMockCatalog();
      
      expect(Array.isArray(catalog)).toBe(true);
      expect(catalog.length).toBeGreaterThan(0);
      expect(catalog[0]).toHaveProperty('productId');
      expect(catalog[0]).toHaveProperty('name');
      expect(catalog[0]).toHaveProperty('brand');
      expect(catalog[0]).toHaveProperty('price');
      expect(catalog[0]).toHaveProperty('inStock');
      expect(catalog[0]).toHaveProperty('category');
    });

    it('should clear mock orders', () => {
      // This is tested implicitly by beforeEach, but we can test it explicitly
      SandboxClient.clearMockOrders();
      // No assertion needed - just verify it doesn't throw
    });
  });

  describe('network delay simulation', () => {
    it('should simulate network delay when enabled', async () => {
      const clientWithDelay = new SandboxClient({ 
        simulateNetworkDelay: true, 
        networkDelayMs: 50 
      });
      
      const startTime = Date.now();
      await clientWithDelay.searchCatalog('milk', 'amazon');
      const endTime = Date.now();
      
      const elapsed = endTime - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(50);
    });

    it('should not delay when disabled', async () => {
      const clientNoDelay = new SandboxClient({ simulateNetworkDelay: false });
      
      const startTime = Date.now();
      await clientNoDelay.searchCatalog('milk', 'amazon');
      const endTime = Date.now();
      
      const elapsed = endTime - startTime;
      expect(elapsed).toBeLessThan(50);
    });
  });
});
