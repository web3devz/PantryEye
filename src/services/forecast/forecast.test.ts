/**
 * Unit tests for Forecast Service
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { forecastService } from './forecast';
import { inventoryService } from '../inventory/inventory';
import { InventoryItem, SKU } from '../../types';

describe('ForecastService', () => {
  beforeEach(() => {
    // Clear caches before each test
    forecastService.clearCache();
    inventoryService.clearCache();
    vi.clearAllMocks();
  });

  describe('computeVelocity', () => {
    it('should return 0 for non-existent SKU', async () => {
      const velocity = await forecastService.computeVelocity('non-existent');
      expect(velocity).toBe(0);
    });

    it('should return 0 for insufficient data (< 2 data points)', async () => {
      // Create item with only 1 data point
      const sku: SKU = {
        id: 'milk-001',
        name: 'Milk',
        category: 'dairy',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      const now = new Date();
      const item: InventoryItem = {
        sku,
        quantity: 5,
        lastUpdated: now,
        history: [
          {
            quantity: 5,
            timestamp: now,
            source: 'manual',
          },
        ],
      };

      // Mock getItem to return our test item
      vi.spyOn(inventoryService, 'getItem').mockResolvedValue(item);

      const velocity = await forecastService.computeVelocity('milk-001');
      expect(velocity).toBe(0);
    });

    it('should compute velocity correctly with 2 data points', async () => {
      const sku: SKU = {
        id: 'milk-001',
        name: 'Milk',
        category: 'dairy',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const item: InventoryItem = {
        sku,
        quantity: 3,
        lastUpdated: now,
        history: [
          {
            quantity: 5,
            timestamp: twoDaysAgo,
            source: 'manual',
          },
          {
            quantity: 3,
            timestamp: now,
            source: 'manual',
          },
        ],
      };

      vi.spyOn(inventoryService, 'getItem').mockResolvedValue(item);

      const velocity = await forecastService.computeVelocity('milk-001');
      
      // Expected: (5 - 3) / 2 = 1.0 items per day
      expect(velocity).toBeCloseTo(1.0, 2);
    });

    it('should apply exponential smoothing with multiple data points', async () => {
      const sku: SKU = {
        id: 'milk-001',
        name: 'Milk',
        category: 'dairy',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const item: InventoryItem = {
        sku,
        quantity: 2,
        lastUpdated: now,
        history: [
          { quantity: 8, timestamp: threeDaysAgo, source: 'manual' },
          { quantity: 6, timestamp: twoDaysAgo, source: 'manual' },
          { quantity: 4, timestamp: oneDayAgo, source: 'manual' },
          { quantity: 2, timestamp: now, source: 'manual' },
        ],
      };

      vi.spyOn(inventoryService, 'getItem').mockResolvedValue(item);

      const velocity = await forecastService.computeVelocity('milk-001');
      
      // With consistent consumption of 2 per day, smoothed velocity should be close to 2.0
      expect(velocity).toBeGreaterThan(0);
      expect(velocity).toBeCloseTo(2.0, 1);
    });

    it('should skip data points with timestamps too close together', async () => {
      const sku: SKU = {
        id: 'milk-001',
        name: 'Milk',
        category: 'dairy',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

      const item: InventoryItem = {
        sku,
        quantity: 3,
        lastUpdated: now,
        history: [
          { quantity: 5, timestamp: oneDayAgo, source: 'manual' },
          { quantity: 4, timestamp: fiveMinutesAgo, source: 'manual' }, // Too close
          { quantity: 3, timestamp: now, source: 'manual' },
        ],
      };

      vi.spyOn(inventoryService, 'getItem').mockResolvedValue(item);

      const velocity = await forecastService.computeVelocity('milk-001');
      
      // Should compute based on valid data points only
      expect(velocity).toBeGreaterThan(0);
    });
  });

  describe('forecastRunout', () => {
    it('should return null for non-existent SKU', async () => {
      vi.spyOn(inventoryService, 'getItem').mockResolvedValue(null);
      
      const runoutDate = await forecastService.forecastRunout('non-existent');
      expect(runoutDate).toBeNull();
    });

    it('should return null for zero velocity', async () => {
      const sku: SKU = {
        id: 'milk-001',
        name: 'Milk',
        category: 'dairy',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      const now = new Date();
      const item: InventoryItem = {
        sku,
        quantity: 5,
        lastUpdated: now,
        history: [
          { quantity: 5, timestamp: now, source: 'manual' },
        ],
      };

      vi.spyOn(inventoryService, 'getItem').mockResolvedValue(item);

      const runoutDate = await forecastService.forecastRunout('milk-001');
      expect(runoutDate).toBeNull();
    });

    it('should return null for negative velocity (increasing quantity)', async () => {
      const sku: SKU = {
        id: 'milk-001',
        name: 'Milk',
        category: 'dairy',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const item: InventoryItem = {
        sku,
        quantity: 7,
        lastUpdated: now,
        history: [
          { quantity: 5, timestamp: twoDaysAgo, source: 'manual' },
          { quantity: 7, timestamp: now, source: 'manual' }, // Quantity increased
        ],
      };

      vi.spyOn(inventoryService, 'getItem').mockResolvedValue(item);

      const runoutDate = await forecastService.forecastRunout('milk-001');
      expect(runoutDate).toBeNull();
    });

    it('should forecast run-out date correctly', async () => {
      const sku: SKU = {
        id: 'milk-001',
        name: 'Milk',
        category: 'dairy',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const item: InventoryItem = {
        sku,
        quantity: 4,
        lastUpdated: now,
        history: [
          { quantity: 6, timestamp: twoDaysAgo, source: 'manual' },
          { quantity: 4, timestamp: now, source: 'manual' },
        ],
      };

      vi.spyOn(inventoryService, 'getItem').mockResolvedValue(item);

      const runoutDate = await forecastService.forecastRunout('milk-001');
      
      expect(runoutDate).not.toBeNull();
      
      // Velocity = (6 - 4) / 2 = 1.0 per day
      // Days until runout = 4 / 1.0 = 4 days
      const expectedDate = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
      
      // Allow 1 hour tolerance for test execution time
      const timeDiff = Math.abs(runoutDate!.getTime() - expectedDate.getTime());
      expect(timeDiff).toBeLessThan(60 * 60 * 1000);
    });
  });

  describe('getItemsNeedingRestock', () => {
    it('should return empty array when no items need restocking', async () => {
      vi.spyOn(inventoryService, 'getInventory').mockResolvedValue([]);

      const restockItems = await forecastService.getItemsNeedingRestock(5);
      expect(restockItems).toEqual([]);
    });

    it('should return items with run-out within threshold', async () => {
      const sku1: SKU = {
        id: 'milk-001',
        name: 'Milk',
        category: 'dairy',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      const sku2: SKU = {
        id: 'eggs-001',
        name: 'Eggs',
        category: 'dairy',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      // Milk: will run out in 2 days (within threshold)
      const milkItem: InventoryItem = {
        sku: sku1,
        quantity: 2,
        lastUpdated: now,
        history: [
          { quantity: 4, timestamp: twoDaysAgo, source: 'manual' },
          { quantity: 2, timestamp: now, source: 'manual' },
        ],
      };

      // Eggs: will run out in 10 days (outside threshold)
      const eggsItem: InventoryItem = {
        sku: sku2,
        quantity: 10,
        lastUpdated: now,
        history: [
          { quantity: 12, timestamp: twoDaysAgo, source: 'manual' },
          { quantity: 10, timestamp: now, source: 'manual' },
        ],
      };

      vi.spyOn(inventoryService, 'getInventory').mockResolvedValue([milkItem, eggsItem]);
      vi.spyOn(inventoryService, 'getItem')
        .mockImplementation(async (skuId: string) => {
          if (skuId === 'milk-001') return milkItem;
          if (skuId === 'eggs-001') return eggsItem;
          return null;
        });

      const restockItems = await forecastService.getItemsNeedingRestock(5);
      
      // Only milk should be in restock list
      expect(restockItems).toHaveLength(1);
      expect(restockItems[0].sku.id).toBe('milk-001');
      expect(restockItems[0].daysUntilRunout).toBeLessThanOrEqual(5);
    });

    it('should sort items by urgency (days until runout)', async () => {
      const sku1: SKU = {
        id: 'milk-001',
        name: 'Milk',
        category: 'dairy',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      const sku2: SKU = {
        id: 'bread-001',
        name: 'Bread',
        category: 'bakery',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      // Milk: will run out in 4 days
      const milkItem: InventoryItem = {
        sku: sku1,
        quantity: 4,
        lastUpdated: now,
        history: [
          { quantity: 6, timestamp: twoDaysAgo, source: 'manual' },
          { quantity: 4, timestamp: now, source: 'manual' },
        ],
      };

      // Bread: will run out in 1 day (more urgent)
      const breadItem: InventoryItem = {
        sku: sku2,
        quantity: 2,
        lastUpdated: now,
        history: [
          { quantity: 6, timestamp: twoDaysAgo, source: 'manual' },
          { quantity: 2, timestamp: now, source: 'manual' },
        ],
      };

      vi.spyOn(inventoryService, 'getInventory').mockResolvedValue([milkItem, breadItem]);
      vi.spyOn(inventoryService, 'getItem')
        .mockImplementation(async (skuId: string) => {
          if (skuId === 'milk-001') return milkItem;
          if (skuId === 'bread-001') return breadItem;
          return null;
        });

      const restockItems = await forecastService.getItemsNeedingRestock(5);
      
      expect(restockItems).toHaveLength(2);
      // Bread should be first (more urgent)
      expect(restockItems[0].sku.id).toBe('bread-001');
      expect(restockItems[1].sku.id).toBe('milk-001');
    });
  });
});
