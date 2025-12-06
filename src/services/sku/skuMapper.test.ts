/**
 * Unit tests for SKU Mapper Service
 * Tests Requirements 2.4, 3.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SKUMapper } from './skuMapper';
import { Detection, ReceiptItem } from '../../types';

describe('SKUMapper', () => {
  let mapper: SKUMapper;

  beforeEach(async () => {
    mapper = new SKUMapper();
    await mapper.initialize();
  });

  describe('mapDetectionToSKU', () => {
    it('should map milk detection to milk SKU', async () => {
      const detection: Detection = {
        class: 'milk',
        confidence: 0.9,
        boundingBox: { x: 0, y: 0, width: 100, height: 100 },
        fillLevel: 75,
      };

      const sku = await mapper.mapDetectionToSKU(detection);

      expect(sku).not.toBeNull();
      expect(sku?.id).toBe('MILK-001');
      expect(sku?.name).toBe('Whole Milk');
      expect(sku?.category).toBe('dairy');
    });

    it('should map eggs detection to eggs SKU', async () => {
      const detection: Detection = {
        class: 'egg_carton',
        confidence: 0.85,
        boundingBox: { x: 0, y: 0, width: 100, height: 100 },
        fillLevel: 100,
      };

      const sku = await mapper.mapDetectionToSKU(detection);

      expect(sku).not.toBeNull();
      expect(sku?.id).toBe('EGGS-001');
      expect(sku?.name).toBe('Large Eggs');
    });

    it('should map bread detection to bread SKU', async () => {
      const detection: Detection = {
        class: 'bread_loaf',
        confidence: 0.8,
        boundingBox: { x: 0, y: 0, width: 100, height: 100 },
        fillLevel: 50,
      };

      const sku = await mapper.mapDetectionToSKU(detection);

      expect(sku).not.toBeNull();
      expect(sku?.id).toBe('BREAD-001');
      expect(sku?.name).toBe('White Bread');
    });

    it('should return null for unknown detection class', async () => {
      const detection: Detection = {
        class: 'unknown_item',
        confidence: 0.5,
        boundingBox: { x: 0, y: 0, width: 100, height: 100 },
        fillLevel: 50,
      };

      const sku = await mapper.mapDetectionToSKU(detection);

      expect(sku).toBeNull();
    });

    it('should handle case-insensitive detection classes', async () => {
      const detection: Detection = {
        class: 'MILK',
        confidence: 0.9,
        boundingBox: { x: 0, y: 0, width: 100, height: 100 },
        fillLevel: 75,
      };

      const sku = await mapper.mapDetectionToSKU(detection);

      expect(sku).not.toBeNull();
      expect(sku?.id).toBe('MILK-001');
    });
  });

  describe('mapReceiptItemToSKU', () => {
    it('should map milk receipt item to milk SKU', async () => {
      const item: ReceiptItem = {
        name: 'Whole Milk',
        quantity: 1,
        price: 3.99,
        confidence: 0.95,
      };

      const sku = await mapper.mapReceiptItemToSKU(item);

      expect(sku).not.toBeNull();
      expect(sku?.id).toBe('MILK-001');
      expect(sku?.name).toBe('Whole Milk');
    });

    it('should map eggs receipt item to eggs SKU', async () => {
      const item: ReceiptItem = {
        name: 'Large Eggs 12ct',
        quantity: 1,
        price: 2.49,
        confidence: 0.9,
      };

      const sku = await mapper.mapReceiptItemToSKU(item);

      expect(sku).not.toBeNull();
      expect(sku?.id).toBe('EGGS-001');
    });

    it('should handle fuzzy matching for receipt items', async () => {
      const item: ReceiptItem = {
        name: 'Sliced White Bread',
        quantity: 1,
        price: 2.99,
        confidence: 0.85,
      };

      const sku = await mapper.mapReceiptItemToSKU(item);

      expect(sku).not.toBeNull();
      expect(sku?.id).toBe('BREAD-001');
    });

    it('should return null for unknown receipt item', async () => {
      const item: ReceiptItem = {
        name: 'Unknown Product XYZ',
        quantity: 1,
        price: 5.99,
        confidence: 0.7,
      };

      const sku = await mapper.mapReceiptItemToSKU(item);

      expect(sku).toBeNull();
    });

    it('should handle case-insensitive receipt names', async () => {
      const item: ReceiptItem = {
        name: 'MILK GALLON',
        quantity: 1,
        price: 3.99,
        confidence: 0.9,
      };

      const sku = await mapper.mapReceiptItemToSKU(item);

      expect(sku).not.toBeNull();
      expect(sku?.id).toBe('MILK-001');
    });
  });

  describe('crossReference', () => {
    it('should return SKU when both detection and receipt agree', async () => {
      const detection: Detection = {
        class: 'milk',
        confidence: 0.9,
        boundingBox: { x: 0, y: 0, width: 100, height: 100 },
        fillLevel: 75,
      };

      const item: ReceiptItem = {
        name: 'Whole Milk',
        quantity: 1,
        price: 3.99,
        confidence: 0.95,
      };

      const sku = await mapper.crossReference(detection, item);

      expect(sku).not.toBeNull();
      expect(sku.id).toBe('MILK-001');
    });

    it('should prefer receipt mapping when detection and receipt disagree', async () => {
      const detection: Detection = {
        class: 'milk',
        confidence: 0.7,
        boundingBox: { x: 0, y: 0, width: 100, height: 100 },
        fillLevel: 75,
      };

      const item: ReceiptItem = {
        name: 'Large Eggs',
        quantity: 1,
        price: 2.49,
        confidence: 0.95,
      };

      const sku = await mapper.crossReference(detection, item);

      expect(sku).not.toBeNull();
      expect(sku.id).toBe('EGGS-001');
    });

    it('should use detection SKU when receipt has no match', async () => {
      const detection: Detection = {
        class: 'bread',
        confidence: 0.85,
        boundingBox: { x: 0, y: 0, width: 100, height: 100 },
        fillLevel: 50,
      };

      const item: ReceiptItem = {
        name: 'Unknown Item',
        quantity: 1,
        price: 2.99,
        confidence: 0.6,
      };

      const sku = await mapper.crossReference(detection, item);

      expect(sku).not.toBeNull();
      expect(sku.id).toBe('BREAD-001');
    });

    it('should create generic SKU when neither detection nor receipt match', async () => {
      const detection: Detection = {
        class: 'unknown_item',
        confidence: 0.5,
        boundingBox: { x: 0, y: 0, width: 100, height: 100 },
        fillLevel: 50,
      };

      const item: ReceiptItem = {
        name: 'Mystery Product',
        quantity: 1,
        price: 4.99,
        confidence: 0.5,
      };

      const sku = await mapper.crossReference(detection, item);

      expect(sku).not.toBeNull();
      expect(sku.id).toContain('GENERIC-');
      expect(sku.name).toBe('Mystery Product');
      expect(sku.category).toBe('unknown');
    });
  });

  describe('getAllMappings', () => {
    it('should return all cached mappings', () => {
      const mappings = mapper.getAllMappings();

      expect(mappings.size).toBeGreaterThan(0);
      expect(mappings.has('MILK-001')).toBe(true);
      expect(mappings.has('EGGS-001')).toBe(true);
      expect(mappings.has('BREAD-001')).toBe(true);
    });
  });
});
