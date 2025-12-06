/**
 * Inventory Service for PantryEye
 * Manages inventory state, reconciliation, and data source integration
 * Requirements: 10.1, 10.2, 10.3, 10.4, 4.2, 2.1, 2.2, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.3, 4.4
 */

import {
  InventoryItem,
  QuantityRecord,
  DataSource,
  SKU,
  InventoryUpdate,
  AuditLogEntry,
} from '../../types';
import { storageService } from '../storage/storage';
import { cvService } from '../cv/cv';
import { ocrService } from '../ocr/ocr';
import { skuMapper } from '../sku/skuMapper';
import { STORES } from '../db/schema';

/**
 * InventoryService class
 * Handles inventory CRUD operations and reconciliation
 */
export class InventoryService {
  private inventoryCache: Map<string, InventoryItem> = new Map();
  private initialized = false;

  /**
   * Initialize the inventory service
   * Loads existing inventory from storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Load existing inventory from storage
    try {
      const skuKeys = await storageService.getAllKeys(STORES.INVENTORY);
      for (const skuId of skuKeys) {
        const item = await storageService.retrieve(STORES.INVENTORY, skuId);
        if (item) {
          // Reconstruct dates from stored data
          item.lastUpdated = new Date(item.lastUpdated);
          item.history = item.history.map((record: any) => ({
            ...record,
            timestamp: new Date(record.timestamp),
          }));
          this.inventoryCache.set(skuId, item);
        }
      }
    } catch (error) {
      // If not authenticated or error, start with empty cache
      console.warn('Failed to load inventory from storage:', error);
    }

    this.initialized = true;
  }

  /**
   * Add a new item to inventory manually
   * Requirement 10.2
   * 
   * @param sku - SKU of the item to add
   * @param quantity - Initial quantity
   * @returns The created inventory item
   */
  async addItem(sku: SKU, quantity: number): Promise<InventoryItem> {
    await this.initialize();

    const now = new Date();
    const quantityRecord: QuantityRecord = {
      quantity,
      timestamp: now,
      source: 'manual',
    };

    const item: InventoryItem = {
      sku,
      quantity,
      lastUpdated: now,
      history: [quantityRecord],
    };

    // Store in cache
    this.inventoryCache.set(sku.id, item);

    // Persist to storage
    await storageService.store(STORES.INVENTORY, sku.id, item);

    // Create audit log entry
    await storageService.appendAuditLog({
      timestamp: now,
      type: 'manual_edit',
      data: {
        action: 'add',
        sku: sku.id,
        quantity,
        source: 'manual',
      },
      source: 'manual',
    });

    return item;
  }

  /**
   * Update an existing item's quantity manually
   * Requirement 10.2
   * 
   * @param skuId - SKU ID of the item to update
   * @param quantity - New quantity
   * @returns The updated inventory item
   */
  async updateItem(skuId: string, quantity: number): Promise<InventoryItem> {
    await this.initialize();

    const item = this.inventoryCache.get(skuId);
    if (!item) {
      throw new Error(`Item with SKU ${skuId} not found in inventory`);
    }

    const now = new Date();
    const quantityRecord: QuantityRecord = {
      quantity,
      timestamp: now,
      source: 'manual',
    };

    // Update item
    item.quantity = quantity;
    item.lastUpdated = now;
    item.history.push(quantityRecord);

    // Update cache
    this.inventoryCache.set(skuId, item);

    // Persist to storage
    await storageService.store(STORES.INVENTORY, skuId, item);

    // Create audit log entry
    await storageService.appendAuditLog({
      timestamp: now,
      type: 'manual_edit',
      data: {
        action: 'update',
        sku: skuId,
        quantity,
        source: 'manual',
      },
      source: 'manual',
    });

    return item;
  }

  /**
   * Get all inventory items
   * Requirement 10.1
   * 
   * @returns Array of all inventory items
   */
  async getInventory(): Promise<InventoryItem[]> {
    await this.initialize();
    return Array.from(this.inventoryCache.values());
  }

  /**
   * Get a specific inventory item by SKU ID
   * 
   * @param skuId - SKU ID of the item
   * @returns The inventory item or null if not found
   */
  async getItem(skuId: string): Promise<InventoryItem | null> {
    await this.initialize();
    return this.inventoryCache.get(skuId) || null;
  }

  /**
   * Delete an item from active inventory
   * Requirement 10.4
   * Historical records are preserved in audit log
   * 
   * @param skuId - SKU ID of the item to delete
   */
  async deleteItem(skuId: string): Promise<void> {
    await this.initialize();

    const item = this.inventoryCache.get(skuId);
    if (!item) {
      throw new Error(`Item with SKU ${skuId} not found in inventory`);
    }

    const now = new Date();

    // Create audit log entry BEFORE deletion to preserve history
    await storageService.appendAuditLog({
      timestamp: now,
      type: 'manual_edit',
      data: {
        action: 'delete',
        sku: skuId,
        previousQuantity: item.quantity,
        history: item.history,
        source: 'manual',
      },
      source: 'manual',
    });

    // Remove from cache
    this.inventoryCache.delete(skuId);

    // Remove from storage
    await storageService.delete(STORES.INVENTORY, skuId);
  }

  /**
   * Process camera capture to update inventory
   * Requirement 2.1, 2.2, 2.4, 2.5, 4.2
   * 
   * @param imageData - Image data from camera
   * @returns Inventory update with affected items and audit log entries
   */
  async processCameraCapture(imageData: ImageData): Promise<InventoryUpdate> {
    await this.initialize();

    const now = new Date();
    const updatedItems: InventoryItem[] = [];
    const auditLogEntries: AuditLogEntry[] = [];

    // Step 1: Detect items using CV service
    const detections = await cvService.detectItems(imageData);

    // Step 2: Process each detection
    for (const detection of detections) {
      // Handle low confidence detections (< 0.7)
      // Requirement 2.5
      if (detection.confidence < 0.7) {
        // Log low confidence detection for user review
        const auditEntry: AuditLogEntry = {
          timestamp: now,
          type: 'inventory_update',
          data: {
            action: 'low_confidence_detection',
            detection,
            requiresReview: true,
            source: 'cv',
          },
          source: 'cv',
        };
        auditLogEntries.push(auditEntry);
        await storageService.appendAuditLog(auditEntry);
        continue; // Skip updating inventory for low confidence
      }

      // Step 3: Map detection to SKU
      const sku = await skuMapper.mapDetectionToSKU(detection);
      if (!sku) {
        // Log unmapped detection
        const auditEntry: AuditLogEntry = {
          timestamp: now,
          type: 'inventory_update',
          data: {
            action: 'unmapped_detection',
            detection,
            source: 'cv',
          },
          source: 'cv',
        };
        auditLogEntries.push(auditEntry);
        await storageService.appendAuditLog(auditEntry);
        continue;
      }

      // Step 4: Estimate quantity from fill level
      // For now, use fill level as percentage of typical quantity
      // TODO: Improve quantity estimation based on item type
      const estimatedQuantity = Math.max(1, Math.round(detection.fillLevel / 25));

      // Step 5: Create data source for reconciliation
      const dataSource: DataSource = {
        type: 'cv',
        quantity: estimatedQuantity,
        timestamp: now,
        confidence: detection.confidence,
      };

      // Step 6: Reconcile with existing inventory
      const item = await this.reconcile(sku.id, [dataSource]);
      updatedItems.push(item);

      // Step 7: Create audit log entry
      const auditEntry: AuditLogEntry = {
        timestamp: now,
        type: 'inventory_update',
        data: {
          action: 'cv_detection',
          sku: sku.id,
          detection,
          quantity: estimatedQuantity,
          source: 'cv',
        },
        source: 'cv',
      };
      auditLogEntries.push(auditEntry);
      await storageService.appendAuditLog(auditEntry);
    }

    return {
      updatedItems,
      auditLogEntries,
      timestamp: now,
    };
  }

  /**
   * Process receipt upload to update inventory
   * Requirement 3.1, 3.2, 3.3, 3.4, 3.5, 4.2
   * 
   * @param imageData - Receipt image data
   * @returns Inventory update with affected items and audit log entries
   */
  async processReceipt(imageData: ImageData): Promise<InventoryUpdate> {
    await this.initialize();

    const now = new Date();
    const updatedItems: InventoryItem[] = [];
    const auditLogEntries: AuditLogEntry[] = [];

    // Step 1: Extract text using OCR
    const text = await ocrService.extractText(imageData);

    // Step 2: Parse receipt
    const receiptData = await ocrService.parseReceipt(text);

    // Step 3: Process each receipt item
    for (const receiptItem of receiptData.items) {
      // Handle ambiguous parsing (low confidence)
      // Requirement 3.4
      if (receiptItem.confidence < 0.6) {
        const auditEntry: AuditLogEntry = {
          timestamp: now,
          type: 'inventory_update',
          data: {
            action: 'ambiguous_receipt_item',
            receiptItem,
            requiresReview: true,
            source: 'receipt',
          },
          source: 'receipt',
        };
        auditLogEntries.push(auditEntry);
        await storageService.appendAuditLog(auditEntry);
        continue; // Skip low confidence items
      }

      // Step 4: Map receipt item to SKU
      let sku = await skuMapper.mapReceiptItemToSKU(receiptItem);

      // Step 5: Try cross-referencing with recent CV detections if available
      // Requirement 3.3
      if (!sku) {
        // Try to find a recent CV detection that might match
        // For now, just use the receipt mapping
        // TODO: Implement cross-referencing with recent CV detections
        sku = await skuMapper.mapReceiptItemToSKU(receiptItem);
      }

      if (!sku) {
        // Log unmapped receipt item
        const auditEntry: AuditLogEntry = {
          timestamp: now,
          type: 'inventory_update',
          data: {
            action: 'unmapped_receipt_item',
            receiptItem,
            source: 'receipt',
          },
          source: 'receipt',
        };
        auditLogEntries.push(auditEntry);
        await storageService.appendAuditLog(auditEntry);
        continue;
      }

      // Step 6: Create data source for reconciliation
      const dataSource: DataSource = {
        type: 'receipt',
        quantity: receiptItem.quantity,
        timestamp: now,
        confidence: receiptItem.confidence,
      };

      // Step 7: Reconcile with existing inventory
      const item = await this.reconcile(sku.id, [dataSource]);
      updatedItems.push(item);

      // Step 8: Create audit log entry
      const auditEntry: AuditLogEntry = {
        timestamp: now,
        type: 'inventory_update',
        data: {
          action: 'receipt_item',
          sku: sku.id,
          receiptItem,
          quantity: receiptItem.quantity,
          source: 'receipt',
        },
        source: 'receipt',
      };
      auditLogEntries.push(auditEntry);
      await storageService.appendAuditLog(auditEntry);
    }

    return {
      updatedItems,
      auditLogEntries,
      timestamp: now,
    };
  }

  /**
   * Reconcile multiple data sources for a single SKU
   * Requirement 4.1, 4.3, 4.4
   * 
   * Prioritizes most recent data source for conflicts
   * Maintains historical quantity records
   * 
   * @param skuId - SKU ID to reconcile
   * @param newSources - New data sources to reconcile
   * @returns The reconciled inventory item
   */
  async reconcile(skuId: string, newSources: DataSource[]): Promise<InventoryItem> {
    await this.initialize();

    // Get existing item or create new one
    let item = this.inventoryCache.get(skuId);
    
    if (!item) {
      // Create new item - need to get SKU details
      // For now, create a minimal SKU (should be provided by caller in real scenario)
      const sku: SKU = {
        id: skuId,
        name: skuId,
        category: 'unknown',
        unit: 'count',
        marketplaceIds: new Map(),
      };

      item = {
        sku,
        quantity: 0,
        lastUpdated: new Date(0),
        history: [],
      };
    }

    // Combine existing history with new sources
    const allSources: DataSource[] = [
      ...item.history.map(record => ({
        type: record.source,
        quantity: record.quantity,
        timestamp: record.timestamp,
        confidence: 1.0, // Historical records are considered confirmed
      })),
      ...newSources,
    ];

    // Sort by timestamp (most recent first)
    allSources.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Requirement 4.3: Prioritize most recent data source
    const mostRecent = allSources[0];

    // Requirement 10.5: Manual edits have priority over CV detections
    // Check if there's a manual edit more recent than CV
    const mostRecentManual = allSources.find(s => s.type === 'manual');
    const mostRecentCV = allSources.find(s => s.type === 'cv');
    
    let finalQuantity = mostRecent.quantity;
    let finalTimestamp = mostRecent.timestamp;

    // If there's a manual edit and a CV detection, prefer manual
    if (mostRecentManual && mostRecentCV) {
      if (mostRecentManual.timestamp >= mostRecentCV.timestamp) {
        finalQuantity = mostRecentManual.quantity;
        finalTimestamp = mostRecentManual.timestamp;
      }
    }

    // Update item with reconciled data
    item.quantity = finalQuantity;
    item.lastUpdated = finalTimestamp;

    // Requirement 4.4: Maintain historical quantity records
    // Add new records to history
    for (const source of newSources) {
      const record: QuantityRecord = {
        quantity: source.quantity,
        timestamp: source.timestamp,
        source: source.type,
      };
      item.history.push(record);
    }

    // Sort history by timestamp
    item.history.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Update cache
    this.inventoryCache.set(skuId, item);

    // Persist to storage
    await storageService.store(STORES.INVENTORY, skuId, item);

    return item;
  }

  /**
   * Clear the inventory cache
   * Useful for testing or logout
   */
  clearCache(): void {
    this.inventoryCache.clear();
    this.initialized = false;
  }
}

// Singleton instance
export const inventoryService = new InventoryService();
