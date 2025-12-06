/**
 * Unit tests for Cart Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CartService } from './cart';
import { SandboxClient } from '../sandbox/sandbox';
import { storageService } from '../storage/storage';
import type { RestockItem, UserMetadata, DraftCart, SKU } from '../../types';

// Mock dependencies
vi.mock('../storage/storage', () => ({
  storageService: {
    store: vi.fn(),
    appendAuditLog: vi.fn(),
  },
}));

describe('CartService', () => {
  let cartService: CartService;
  let mockSandboxClient: SandboxClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSandboxClient = new SandboxClient({ simulateNetworkDelay: false });
    cartService = new CartService(mockSandboxClient);
  });

  describe('buildDraftCart', () => {
    it('should build a cart from restock items', async () => {
      const restockItems: RestockItem[] = [
        {
          sku: {
            id: 'milk-001',
            name: 'Milk',
            category: 'dairy',
            unit: 'gallon',
            marketplaceIds: new Map(),
          },
          currentQuantity: 0.5,
          forecastedRunoutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          daysUntilRunout: 2,
          velocity: 0.25,
        },
      ];

      const userMetadata: UserMetadata = {
        householdMembers: 2,
        brandPreferences: new Map([['dairy', ['Horizon']]]),
        spendingCap: 100,
        vendorAllowlist: ['amazon'],
      };

      const cart = await cartService.buildDraftCart(restockItems, userMetadata);

      expect(cart.items.length).toBeGreaterThan(0);
      expect(cart.vendor).toBe('amazon');
      expect(cart.totalPrice).toBeGreaterThan(0);
      expect(cart.explanations.size).toBeGreaterThan(0);
    });

    it('should respect spending cap', async () => {
      const restockItems: RestockItem[] = [
        {
          sku: {
            id: 'milk-001',
            name: 'Milk',
            category: 'dairy',
            unit: 'gallon',
            marketplaceIds: new Map(),
          },
          currentQuantity: 0.5,
          forecastedRunoutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          daysUntilRunout: 2,
          velocity: 0.25,
        },
      ];

      const userMetadata: UserMetadata = {
        householdMembers: 2,
        brandPreferences: new Map(),
        spendingCap: 1, // Very low cap
        vendorAllowlist: ['amazon'],
      };

      const cart = await cartService.buildDraftCart(restockItems, userMetadata);

      expect(cart.totalPrice).toBeLessThanOrEqual(1);
    });

    it('should apply brand preferences', async () => {
      const restockItems: RestockItem[] = [
        {
          sku: {
            id: 'milk-001',
            name: 'Milk',
            category: 'dairy',
            unit: 'gallon',
            marketplaceIds: new Map(),
          },
          currentQuantity: 0.5,
          forecastedRunoutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          daysUntilRunout: 2,
          velocity: 0.25,
        },
      ];

      const userMetadata: UserMetadata = {
        householdMembers: 2,
        brandPreferences: new Map([['dairy', ['Horizon']]]),
        vendorAllowlist: ['amazon'],
      };

      const cart = await cartService.buildDraftCart(restockItems, userMetadata);

      // Check if preferred brand was selected
      const milkItem = cart.items.find((item) => item.sku.id === 'milk-001');
      expect(milkItem).toBeDefined();
      expect(milkItem?.brand).toBe('Horizon');
    });

    it('should respect vendor allowlist', async () => {
      const restockItems: RestockItem[] = [
        {
          sku: {
            id: 'milk-001',
            name: 'Milk',
            category: 'dairy',
            unit: 'gallon',
            marketplaceIds: new Map(),
          },
          currentQuantity: 0.5,
          forecastedRunoutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          daysUntilRunout: 2,
          velocity: 0.25,
        },
      ];

      const userMetadata: UserMetadata = {
        householdMembers: 2,
        brandPreferences: new Map(),
        vendorAllowlist: ['walmart'],
      };

      const cart = await cartService.buildDraftCart(restockItems, userMetadata);

      expect(cart.vendor).toBe('walmart');
    });

    it('should create explanations for cart items', async () => {
      const restockItems: RestockItem[] = [
        {
          sku: {
            id: 'milk-001',
            name: 'Milk',
            category: 'dairy',
            unit: 'gallon',
            marketplaceIds: new Map(),
          },
          currentQuantity: 0.5,
          forecastedRunoutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          daysUntilRunout: 3,
          velocity: 0.25,
        },
      ];

      const userMetadata: UserMetadata = {
        householdMembers: 2,
        brandPreferences: new Map(),
        vendorAllowlist: ['amazon'],
      };

      const cart = await cartService.buildDraftCart(restockItems, userMetadata);

      const explanation = cart.explanations.get('milk-001');
      expect(explanation).toBeDefined();
      expect(explanation).toContain('Milk');
      expect(explanation).toContain('3 days');
    });
  });

  describe('applyPreferences', () => {
    it('should update cart items with preferences', async () => {
      const cart: DraftCart = {
        items: [
          {
            sku: {
              id: 'milk-001',
              name: 'Milk',
              category: 'dairy',
              unit: 'gallon',
              marketplaceIds: new Map(),
            },
            marketplaceProductId: 'AMZ-MILK-002',
            quantity: 1,
            price: 3.99,
            brand: 'Great Value',
            isSubstitute: false,
          },
        ],
        totalPrice: 3.99,
        vendor: 'amazon',
        explanations: new Map(),
      };

      const preferences: UserMetadata = {
        householdMembers: 2,
        brandPreferences: new Map([['dairy', ['Horizon']]]),
        vendorAllowlist: ['amazon'],
      };

      const updatedCart = await cartService.applyPreferences(cart, preferences);

      const milkItem = updatedCart.items[0];
      expect(milkItem.brand).toBe('Horizon');
    });
  });

  describe('getSubstitutes', () => {
    it('should return substitute options for a SKU', async () => {
      const sku: SKU = {
        id: 'milk-001',
        name: 'Milk',
        category: 'dairy',
        unit: 'gallon',
        marketplaceIds: new Map(),
      };

      const substitutes = await cartService.getSubstitutes(sku, 'amazon');

      expect(substitutes.length).toBeGreaterThan(0);
      expect(substitutes[0]).toHaveProperty('marketplaceProductId');
      expect(substitutes[0]).toHaveProperty('brand');
      expect(substitutes[0]).toHaveProperty('price');
      expect(substitutes[0]).toHaveProperty('ranking');
    });

    it('should rank substitutes', async () => {
      const sku: SKU = {
        id: 'milk-001',
        name: 'Milk',
        category: 'dairy',
        unit: 'gallon',
        marketplaceIds: new Map(),
      };

      const substitutes = await cartService.getSubstitutes(sku, 'amazon');

      // Check that rankings are in descending order
      for (let i = 1; i < substitutes.length; i++) {
        expect(substitutes[i - 1].ranking).toBeGreaterThanOrEqual(substitutes[i].ranking);
      }
    });
  });

  describe('submitOrder', () => {
    it('should submit order and store confirmation', async () => {
      const cart: DraftCart = {
        items: [
          {
            sku: {
              id: 'milk-001',
              name: 'Milk',
              category: 'dairy',
              unit: 'gallon',
              marketplaceIds: new Map(),
            },
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

      const orderConfirmation = await cartService.submitOrder(cart);

      expect(orderConfirmation.orderId).toBeDefined();
      expect(orderConfirmation.vendor).toBe('amazon');
      expect(orderConfirmation.items.length).toBe(1);
      expect(orderConfirmation.totalPrice).toBe(5.99);

      // Verify storage was called
      expect(storageService.store).toHaveBeenCalled();
      expect(storageService.appendAuditLog).toHaveBeenCalled();
    });

    it('should create audit log entry for order', async () => {
      const cart: DraftCart = {
        items: [
          {
            sku: {
              id: 'milk-001',
              name: 'Milk',
              category: 'dairy',
              unit: 'gallon',
              marketplaceIds: new Map(),
            },
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

      await cartService.submitOrder(cart);

      expect(storageService.appendAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'order_placed',
          source: 'cart_service',
        })
      );
    });
  });
});
