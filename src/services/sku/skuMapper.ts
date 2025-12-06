/**
 * SKU Mapping Service for PantryEye
 * Maps CV detections and receipt items to standardized SKUs
 * Requirements: 2.4, 3.3
 */

import { SKU, Detection, ReceiptItem, MappingFeedback } from '../../types';
import { storageService } from '../storage/storage';
import { STORES } from '../db/schema';

/**
 * Internal mapping data structure
 */
interface SKUMappingData {
  sku: SKU;
  detectionClasses: string[]; // CV detection classes that map to this SKU
  receiptNames: string[]; // Receipt item names that map to this SKU
  feedbackScores: number[]; // User feedback ratings
  lastUpdated: Date;
}

/**
 * SKU Mapper class
 * Handles mapping of CV detections and receipt items to SKUs
 */
export class SKUMapper {
  private mappingCache: Map<string, SKUMappingData> = new Map();
  private initialized = false;

  /**
   * Initialize the SKU mapper with default mappings
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Create initial SKU mapping table for common items
    await this.createDefaultMappings();
    this.initialized = true;
  }

  /**
   * Create default SKU mappings for common pantry items
   */
  private async createDefaultMappings(): Promise<void> {
    const defaultMappings: SKUMappingData[] = [
      // Milk
      {
        sku: {
          id: 'MILK-001',
          name: 'Whole Milk',
          category: 'dairy',
          unit: 'gallon',
          marketplaceIds: new Map([
            ['amazon', 'B001MILK001'],
            ['walmart', 'WM-MILK-001'],
          ]),
        },
        detectionClasses: ['milk', 'milk_carton', 'milk_jug', 'dairy_milk'],
        receiptNames: ['milk', 'whole milk', 'milk gallon', 'milk 1gal'],
        feedbackScores: [],
        lastUpdated: new Date(),
      },
      // Eggs
      {
        sku: {
          id: 'EGGS-001',
          name: 'Large Eggs',
          category: 'dairy',
          unit: 'dozen',
          marketplaceIds: new Map([
            ['amazon', 'B001EGGS001'],
            ['walmart', 'WM-EGGS-001'],
          ]),
        },
        detectionClasses: ['eggs', 'egg_carton', 'egg_box'],
        receiptNames: ['eggs', 'large eggs', 'eggs dozen', 'eggs 12ct'],
        feedbackScores: [],
        lastUpdated: new Date(),
      },
      // Bread
      {
        sku: {
          id: 'BREAD-001',
          name: 'White Bread',
          category: 'bakery',
          unit: 'loaf',
          marketplaceIds: new Map([
            ['amazon', 'B001BREAD001'],
            ['walmart', 'WM-BREAD-001'],
          ]),
        },
        detectionClasses: ['bread', 'bread_loaf', 'white_bread', 'sliced_bread'],
        receiptNames: ['bread', 'white bread', 'bread loaf', 'sliced bread'],
        feedbackScores: [],
        lastUpdated: new Date(),
      },
      // Butter
      {
        sku: {
          id: 'BUTTER-001',
          name: 'Butter',
          category: 'dairy',
          unit: 'lb',
          marketplaceIds: new Map([
            ['amazon', 'B001BUTTER001'],
            ['walmart', 'WM-BUTTER-001'],
          ]),
        },
        detectionClasses: ['butter', 'butter_stick', 'butter_package'],
        receiptNames: ['butter', 'butter 1lb', 'salted butter', 'unsalted butter'],
        feedbackScores: [],
        lastUpdated: new Date(),
      },
      // Cheese
      {
        sku: {
          id: 'CHEESE-001',
          name: 'Cheddar Cheese',
          category: 'dairy',
          unit: 'lb',
          marketplaceIds: new Map([
            ['amazon', 'B001CHEESE001'],
            ['walmart', 'WM-CHEESE-001'],
          ]),
        },
        detectionClasses: ['cheese', 'cheese_block', 'cheddar', 'cheese_package'],
        receiptNames: ['cheese', 'cheddar cheese', 'cheese block', 'shredded cheese'],
        feedbackScores: [],
        lastUpdated: new Date(),
      },
      // Yogurt
      {
        sku: {
          id: 'YOGURT-001',
          name: 'Plain Yogurt',
          category: 'dairy',
          unit: 'oz',
          marketplaceIds: new Map([
            ['amazon', 'B001YOGURT001'],
            ['walmart', 'WM-YOGURT-001'],
          ]),
        },
        detectionClasses: ['yogurt', 'yogurt_container', 'yogurt_cup'],
        receiptNames: ['yogurt', 'plain yogurt', 'yogurt 32oz', 'greek yogurt'],
        feedbackScores: [],
        lastUpdated: new Date(),
      },
      // Orange Juice
      {
        sku: {
          id: 'OJ-001',
          name: 'Orange Juice',
          category: 'beverages',
          unit: 'oz',
          marketplaceIds: new Map([
            ['amazon', 'B001OJ001'],
            ['walmart', 'WM-OJ-001'],
          ]),
        },
        detectionClasses: ['orange_juice', 'oj', 'juice_carton', 'juice_bottle'],
        receiptNames: ['orange juice', 'oj', 'tropicana', 'simply orange'],
        feedbackScores: [],
        lastUpdated: new Date(),
      },
      // Apples
      {
        sku: {
          id: 'APPLE-001',
          name: 'Apples',
          category: 'produce',
          unit: 'lb',
          marketplaceIds: new Map([
            ['amazon', 'B001APPLE001'],
            ['walmart', 'WM-APPLE-001'],
          ]),
        },
        detectionClasses: ['apple', 'apples', 'red_apple', 'green_apple'],
        receiptNames: ['apples', 'apple', 'gala apples', 'fuji apples', 'honeycrisp'],
        feedbackScores: [],
        lastUpdated: new Date(),
      },
      // Bananas
      {
        sku: {
          id: 'BANANA-001',
          name: 'Bananas',
          category: 'produce',
          unit: 'lb',
          marketplaceIds: new Map([
            ['amazon', 'B001BANANA001'],
            ['walmart', 'WM-BANANA-001'],
          ]),
        },
        detectionClasses: ['banana', 'bananas', 'banana_bunch'],
        receiptNames: ['bananas', 'banana', 'organic bananas'],
        feedbackScores: [],
        lastUpdated: new Date(),
      },
      // Tomatoes
      {
        sku: {
          id: 'TOMATO-001',
          name: 'Tomatoes',
          category: 'produce',
          unit: 'lb',
          marketplaceIds: new Map([
            ['amazon', 'B001TOMATO001'],
            ['walmart', 'WM-TOMATO-001'],
          ]),
        },
        detectionClasses: ['tomato', 'tomatoes', 'cherry_tomatoes', 'roma_tomatoes'],
        receiptNames: ['tomatoes', 'tomato', 'cherry tomatoes', 'roma tomatoes'],
        feedbackScores: [],
        lastUpdated: new Date(),
      },
    ];

    // Store default mappings
    for (const mapping of defaultMappings) {
      // Cache in memory
      this.mappingCache.set(mapping.sku.id, mapping);

      // Store each detection class mapping
      for (const detectionClass of mapping.detectionClasses) {
        try {
          await storageService.store(STORES.SKU_MAPPING, detectionClass, {
            skuId: mapping.sku.id,
            type: 'detection',
          });
        } catch (error) {
          // If not authenticated, skip storage (will use cache only)
          console.warn('SKU mapping storage skipped (not authenticated):', error);
        }
      }

      // Store each receipt name mapping
      for (const receiptName of mapping.receiptNames) {
        try {
          await storageService.store(STORES.SKU_MAPPING, receiptName.toLowerCase(), {
            skuId: mapping.sku.id,
            type: 'receipt',
          });
        } catch (error) {
          console.warn('SKU mapping storage skipped (not authenticated):', error);
        }
      }
    }
  }

  /**
   * Map CV detection class to SKU
   * Requirement 2.4
   */
  async mapDetectionToSKU(detection: Detection): Promise<SKU | null> {
    await this.initialize();

    const detectionClass = detection.class.toLowerCase();

    // Try to find mapping in storage
    try {
      const mapping = await storageService.retrieve(STORES.SKU_MAPPING, detectionClass);
      if (mapping && mapping.skuId) {
        const skuData = this.mappingCache.get(mapping.skuId);
        return skuData ? skuData.sku : null;
      }
    } catch (error) {
      // If not authenticated or error, fall back to cache
    }

    // Fall back to cache search
    for (const [, mappingData] of this.mappingCache) {
      if (mappingData.detectionClasses.includes(detectionClass)) {
        return mappingData.sku;
      }
    }

    return null;
  }

  /**
   * Map receipt item to SKU
   * Requirement 2.4
   */
  async mapReceiptItemToSKU(item: ReceiptItem): Promise<SKU | null> {
    await this.initialize();

    const itemName = item.name.toLowerCase().trim();

    // Try to find mapping in storage
    try {
      const mapping = await storageService.retrieve(STORES.SKU_MAPPING, itemName);
      if (mapping && mapping.skuId) {
        const skuData = this.mappingCache.get(mapping.skuId);
        return skuData ? skuData.sku : null;
      }
    } catch (error) {
      // If not authenticated or error, fall back to cache
    }

    // Fall back to cache search with fuzzy matching
    for (const [, mappingData] of this.mappingCache) {
      for (const receiptName of mappingData.receiptNames) {
        if (itemName.includes(receiptName) || receiptName.includes(itemName)) {
          return mappingData.sku;
        }
      }
    }

    return null;
  }

  /**
   * Cross-reference CV detection and receipt item to improve mapping accuracy
   * Requirement 3.3
   */
  async crossReference(detection: Detection, receiptItem: ReceiptItem): Promise<SKU> {
    await this.initialize();

    // Try both mappings
    const detectionSKU = await this.mapDetectionToSKU(detection);
    const receiptSKU = await this.mapReceiptItemToSKU(receiptItem);

    // If both agree, return with high confidence
    if (detectionSKU && receiptSKU && detectionSKU.id === receiptSKU.id) {
      return detectionSKU;
    }

    // If only one found, return that one
    if (detectionSKU && !receiptSKU) {
      return detectionSKU;
    }

    if (receiptSKU && !detectionSKU) {
      return receiptSKU;
    }

    // If both found but disagree, prefer receipt (more accurate text)
    if (receiptSKU) {
      return receiptSKU;
    }

    // If neither found, create a generic SKU
    const genericName = receiptItem.name || detection.class;
    return {
      id: `GENERIC-${Date.now()}`,
      name: genericName,
      category: 'unknown',
      unit: 'count',
      marketplaceIds: new Map(),
    };
  }

  /**
   * Update SKU mapping based on user feedback
   */
  async updateMapping(sku: SKU, userFeedback: MappingFeedback): Promise<void> {
    await this.initialize();

    const mappingData = this.mappingCache.get(sku.id);
    if (!mappingData) {
      return;
    }

    // Add feedback score
    mappingData.feedbackScores.push(userFeedback.rating);
    mappingData.lastUpdated = new Date();

    // Update cache
    this.mappingCache.set(sku.id, mappingData);

    // Persist to storage if authenticated
    try {
      for (const detectionClass of mappingData.detectionClasses) {
        await storageService.store(STORES.SKU_MAPPING, detectionClass, {
          skuId: sku.id,
          type: 'detection',
          feedbackScores: mappingData.feedbackScores,
        });
      }
    } catch (error) {
      console.warn('Failed to persist feedback:', error);
    }
  }

  /**
   * Get all cached SKU mappings
   */
  getAllMappings(): Map<string, SKUMappingData> {
    return new Map(this.mappingCache);
  }
}

// Singleton instance
export const skuMapper = new SKUMapper();
