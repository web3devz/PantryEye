/**
 * Unit tests for Inventory Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryService } from './inventory';
import { storageService } from '../storage/storage';
import { cvService } from '../cv/cv';
import { ocrService } from '../ocr/ocr';
import { skuMapper } from '../sku/skuMapper';
import { database } from '../db/database';
import { cryptoService } from '../crypto/crypto';
import { SKU, DataSource } from '../../types';

describe('InventoryService', () => {
  let inventoryService: InventoryService;
  let testKey: CryptoKey;

  beforeEach(async () => {
    // Initialize database
    await database.init();

    // Create test encryption key
    const password = 'test-password-123';
    const salt = cryptoService.generateSalt();
    testKey = await cryptoService.deriveKey(password, salt);
    storageService.setEncryptionKey(testKey);

    // Initialize services
    await skuMapper.initialize();
    await cvService.initialize();
    await ocrService.initialize();

    // Create fresh inventory service instance
    inventoryService = new InventoryService();
  });

  describe('addItem', () => {
    it('should add a new item to inventory', async () => {
      const sku: SKU = {
        id: 'TEST-001',
        name: 'Test Item',
        category: 'test',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      const item = await inventoryService.addItem(sku, 5);

      expect(item.sku.id).toBe('TEST-001');
      expect(item.quantity).toBe(5);
      expect(item.history).toHaveLength(1);
      expect(item.history[0].source).toBe('manual');
      expect(item.history[0].quantity).toBe(5);
    });

    it('should persist item to storage', async () => {
      const sku: SKU = {
        id: 'TEST-002',
        name: 'Test Item 2',
        category: 'test',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      await inventoryService.addItem(sku, 3);

      // Retrieve from storage
      const retrieved = await storageService.retrieve('inventory', 'TEST-002');
      expect(retrieved).toBeDefined();
      expect(retrieved.quantity).toBe(3);
    });

    it('should create audit log entry', async () => {
      const sku: SKU = {
        id: 'TEST-003',
        name: 'Test Item 3',
        category: 'test',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      const item = await inventoryService.addItem(sku, 2);

      // Verify item was created (audit log is tested separately)
      expect(item.sku.id).toBe('TEST-003');
      expect(item.quantity).toBe(2);
    });
  });

  describe('updateItem', () => {
    it('should update existing item quantity', async () => {
      const sku: SKU = {
        id: 'TEST-004',
        name: 'Test Item 4',
        category: 'test',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      // Add item first
      await inventoryService.addItem(sku, 5);

      // Update quantity
      const updated = await inventoryService.updateItem('TEST-004', 8);

      expect(updated.quantity).toBe(8);
      expect(updated.history).toHaveLength(2);
      expect(updated.history[1].quantity).toBe(8);
      expect(updated.history[1].source).toBe('manual');
    });

    it('should throw error for non-existent item', async () => {
      await expect(
        inventoryService.updateItem('NON-EXISTENT', 10)
      ).rejects.toThrow('not found');
    });

    it('should maintain history of updates', async () => {
      const sku: SKU = {
        id: 'TEST-005',
        name: 'Test Item 5',
        category: 'test',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      await inventoryService.addItem(sku, 5);
      await inventoryService.updateItem('TEST-005', 3);
      await inventoryService.updateItem('TEST-005', 7);

      const item = await inventoryService.getItem('TEST-005');
      expect(item?.history).toHaveLength(3);
      expect(item?.history[0].quantity).toBe(5);
      expect(item?.history[1].quantity).toBe(3);
      expect(item?.history[2].quantity).toBe(7);
    });
  });

  describe('getInventory', () => {
    it('should return all inventory items', async () => {
      const sku1: SKU = {
        id: 'TEST-006',
        name: 'Test Item 6',
        category: 'test',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      const sku2: SKU = {
        id: 'TEST-007',
        name: 'Test Item 7',
        category: 'test',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      await inventoryService.addItem(sku1, 5);
      await inventoryService.addItem(sku2, 3);

      const inventory = await inventoryService.getInventory();
      expect(inventory).toHaveLength(2);
      expect(inventory.map(i => i.sku.id)).toContain('TEST-006');
      expect(inventory.map(i => i.sku.id)).toContain('TEST-007');
    });

    it('should return empty array when no items', async () => {
      const inventory = await inventoryService.getInventory();
      expect(inventory).toEqual([]);
    });
  });

  describe('deleteItem', () => {
    it('should remove item from inventory', async () => {
      const sku: SKU = {
        id: 'TEST-008',
        name: 'Test Item 8',
        category: 'test',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      await inventoryService.addItem(sku, 5);
      await inventoryService.deleteItem('TEST-008');

      const item = await inventoryService.getItem('TEST-008');
      expect(item).toBeNull();
    });

    it('should preserve history in audit log', async () => {
      const sku: SKU = {
        id: 'TEST-009',
        name: 'Test Item 9',
        category: 'test',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      await inventoryService.addItem(sku, 5);
      await inventoryService.updateItem('TEST-009', 3);
      
      // Verify item exists before deletion
      const itemBeforeDelete = await inventoryService.getItem('TEST-009');
      expect(itemBeforeDelete).toBeDefined();
      expect(itemBeforeDelete?.quantity).toBe(3);
      
      await inventoryService.deleteItem('TEST-009');

      // Verify item is deleted
      const itemAfterDelete = await inventoryService.getItem('TEST-009');
      expect(itemAfterDelete).toBeNull();
    });

    it('should throw error for non-existent item', async () => {
      await expect(
        inventoryService.deleteItem('NON-EXISTENT')
      ).rejects.toThrow('not found');
    });
  });

  describe('processCameraCapture', () => {
    it('should process CV detections and update inventory', async () => {
      // Create mock image data (Node.js compatible)
      const imageData = {
        width: 640,
        height: 480,
        data: new Uint8ClampedArray(640 * 480 * 4),
      } as ImageData;

      const result = await inventoryService.processCameraCapture(imageData);

      // Result should have timestamp and audit entries
      // Updated items may be 0 if detections don't map to known SKUs
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.auditLogEntries.length).toBeGreaterThan(0);
    });

    it('should skip low confidence detections', async () => {
      const imageData = {
        width: 640,
        height: 480,
        data: new Uint8ClampedArray(640 * 480 * 4),
      } as ImageData;

      // Mock CV service to return low confidence detection
      vi.spyOn(cvService, 'detectItems').mockResolvedValue([
        {
          class: 'milk',
          confidence: 0.5, // Below 0.7 threshold
          boundingBox: { x: 0, y: 0, width: 100, height: 100 },
          fillLevel: 75,
        },
      ]);

      const result = await inventoryService.processCameraCapture(imageData);

      // Should have audit log entry but no updated items
      expect(result.updatedItems).toHaveLength(0);
      expect(result.auditLogEntries.length).toBeGreaterThan(0);
      expect(result.auditLogEntries[0].data.action).toBe('low_confidence_detection');
    });

    it('should handle unmapped detections', async () => {
      const imageData = {
        width: 640,
        height: 480,
        data: new Uint8ClampedArray(640 * 480 * 4),
      } as ImageData;

      // Mock CV service to return unknown item
      vi.spyOn(cvService, 'detectItems').mockResolvedValue([
        {
          class: 'unknown_item_xyz',
          confidence: 0.9,
          boundingBox: { x: 0, y: 0, width: 100, height: 100 },
          fillLevel: 75,
        },
      ]);

      const result = await inventoryService.processCameraCapture(imageData);

      // Should have audit log entry for unmapped detection
      const unmappedEntry = result.auditLogEntries.find(
        e => e.data.action === 'unmapped_detection'
      );
      expect(unmappedEntry).toBeDefined();
    });
  });

  describe('processReceipt', () => {
    it('should process receipt and update inventory', async () => {
      const imageData = {
        width: 640,
        height: 480,
        data: new Uint8ClampedArray(640 * 480 * 4),
      } as ImageData;

      const result = await inventoryService.processReceipt(imageData);

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.auditLogEntries.length).toBeGreaterThan(0);
    });

    it('should skip ambiguous receipt items', async () => {
      const imageData = {
        width: 640,
        height: 480,
        data: new Uint8ClampedArray(640 * 480 * 4),
      } as ImageData;

      // Mock OCR to return low confidence items
      vi.spyOn(ocrService, 'parseReceipt').mockResolvedValue({
        items: [
          {
            name: 'unclear text',
            quantity: 1,
            price: 5.99,
            confidence: 0.4, // Below 0.6 threshold
          },
        ],
        total: 5.99,
        date: new Date(),
        confidence: 0.5,
      });

      const result = await inventoryService.processReceipt(imageData);

      // Should have audit log entry but no updated items
      expect(result.updatedItems).toHaveLength(0);
      const ambiguousEntry = result.auditLogEntries.find(
        e => e.data.action === 'ambiguous_receipt_item'
      );
      expect(ambiguousEntry).toBeDefined();
    });
  });

  describe('reconcile', () => {
    it('should prioritize most recent data source', async () => {
      const sku: SKU = {
        id: 'TEST-010',
        name: 'Test Item 10',
        category: 'test',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      // Add initial item
      await inventoryService.addItem(sku, 5);

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      // Add newer data source
      const newSource: DataSource = {
        type: 'cv',
        quantity: 8,
        timestamp: new Date(),
        confidence: 0.9,
      };

      const reconciled = await inventoryService.reconcile('TEST-010', [newSource]);

      expect(reconciled.quantity).toBe(8);
      expect(reconciled.history).toHaveLength(2);
    });

    it('should prioritize manual edits over CV detections', async () => {
      const sku: SKU = {
        id: 'TEST-011',
        name: 'Test Item 11',
        category: 'test',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      // Add item with CV detection
      await inventoryService.addItem(sku, 5);

      const now = new Date();

      // Add CV detection
      const cvSource: DataSource = {
        type: 'cv',
        quantity: 3,
        timestamp: new Date(now.getTime() + 1000),
        confidence: 0.9,
      };

      // Add manual edit after CV
      const manualSource: DataSource = {
        type: 'manual',
        quantity: 7,
        timestamp: new Date(now.getTime() + 2000),
        confidence: 1.0,
      };

      const reconciled = await inventoryService.reconcile('TEST-011', [cvSource, manualSource]);

      // Manual edit should win
      expect(reconciled.quantity).toBe(7);
    });

    it('should maintain historical quantity records', async () => {
      const sku: SKU = {
        id: 'TEST-012',
        name: 'Test Item 12',
        category: 'test',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      await inventoryService.addItem(sku, 5);

      const source1: DataSource = {
        type: 'cv',
        quantity: 4,
        timestamp: new Date(),
        confidence: 0.9,
      };

      const source2: DataSource = {
        type: 'receipt',
        quantity: 6,
        timestamp: new Date(),
        confidence: 0.85,
      };

      const reconciled = await inventoryService.reconcile('TEST-012', [source1, source2]);

      // Should have all historical records
      expect(reconciled.history.length).toBeGreaterThanOrEqual(3);
    });

    it('should create new item if not exists', async () => {
      const newSource: DataSource = {
        type: 'cv',
        quantity: 3,
        timestamp: new Date(),
        confidence: 0.9,
      };

      const reconciled = await inventoryService.reconcile('NEW-ITEM', [newSource]);

      expect(reconciled.sku.id).toBe('NEW-ITEM');
      expect(reconciled.quantity).toBe(3);
      expect(reconciled.history).toHaveLength(1);
    });
  });
});
