/**
 * Demo Data Seeder
 * Provides sample data for easy app exploration
 */

import { inventoryService } from '../inventory/inventory';
import { storageService } from '../storage/storage';
import { STORES } from '../db/schema';
import type { InventoryItem, SKU } from '../../types';

/**
 * Sample SKUs for demo data
 */
const DEMO_SKUS: SKU[] = [
  { id: 'sku-milk-001', name: 'Whole Milk', category: 'dairy', unit: 'gallon', marketplaceIds: new Map() },
  { id: 'sku-eggs-001', name: 'Large Eggs', category: 'dairy', unit: 'dozen', marketplaceIds: new Map() },
  { id: 'sku-bread-001', name: 'Whole Wheat Bread', category: 'bakery', unit: 'loaf', marketplaceIds: new Map() },
  { id: 'sku-cheese-001', name: 'Cheddar Cheese', category: 'dairy', unit: 'lb', marketplaceIds: new Map() },
  { id: 'sku-yogurt-001', name: 'Greek Yogurt', category: 'dairy', unit: 'container', marketplaceIds: new Map() },
  { id: 'sku-butter-001', name: 'Butter', category: 'dairy', unit: 'lb', marketplaceIds: new Map() },
  { id: 'sku-apple-001', name: 'Gala Apples', category: 'produce', unit: 'lb', marketplaceIds: new Map() },
  { id: 'sku-banana-001', name: 'Bananas', category: 'produce', unit: 'bunch', marketplaceIds: new Map() },
  { id: 'sku-orange-001', name: 'Oranges', category: 'produce', unit: 'lb', marketplaceIds: new Map() },
  { id: 'sku-lettuce-001', name: 'Romaine Lettuce', category: 'produce', unit: 'head', marketplaceIds: new Map() },
  { id: 'sku-tomato-001', name: 'Tomatoes', category: 'produce', unit: 'lb', marketplaceIds: new Map() },
  { id: 'sku-pasta-001', name: 'Spaghetti', category: 'pantry', unit: 'box', marketplaceIds: new Map() },
  { id: 'sku-rice-001', name: 'White Rice', category: 'pantry', unit: 'lb', marketplaceIds: new Map() },
  { id: 'sku-cereal-001', name: 'Corn Flakes', category: 'pantry', unit: 'box', marketplaceIds: new Map() },
  { id: 'sku-coffee-001', name: 'Ground Coffee', category: 'pantry', unit: 'lb', marketplaceIds: new Map() },
];

/**
 * Generate demo inventory items with realistic quantities and history
 */
function generateDemoInventory(): InventoryItem[] {
  const now = new Date();
  const items: InventoryItem[] = [];

  // Items with good stock (sufficient)
  items.push(createItemWithHistory(DEMO_SKUS[0], 2, 3, now)); // Milk - 2 gallons
  items.push(createItemWithHistory(DEMO_SKUS[2], 1, 2, now)); // Bread - 1 loaf
  items.push(createItemWithHistory(DEMO_SKUS[5], 1, 2, now)); // Butter - 1 lb
  items.push(createItemWithHistory(DEMO_SKUS[11], 3, 4, now)); // Pasta - 3 boxes
  items.push(createItemWithHistory(DEMO_SKUS[12], 5, 8, now)); // Rice - 5 lbs
  items.push(createItemWithHistory(DEMO_SKUS[14], 1, 2, now)); // Coffee - 1 lb

  // Items running low (will show in cart)
  items.push(createItemWithHistory(DEMO_SKUS[1], 0.5, 1, now)); // Eggs - half dozen left
  items.push(createItemWithHistory(DEMO_SKUS[3], 0.3, 1, now)); // Cheese - 0.3 lb
  items.push(createItemWithHistory(DEMO_SKUS[4], 1, 3, now)); // Yogurt - 1 container
  items.push(createItemWithHistory(DEMO_SKUS[6], 1, 3, now)); // Apples - 1 lb

  // Items out of stock (will show in cart immediately)
  items.push(createItemWithHistory(DEMO_SKUS[7], 0, 2, now)); // Bananas - out
  items.push(createItemWithHistory(DEMO_SKUS[9], 0, 1, now)); // Lettuce - out

  // Items with minimal history (will show "tracking")
  items.push({
    sku: DEMO_SKUS[8],
    quantity: 3,
    lastUpdated: now,
    history: [
      { timestamp: now, quantity: 3, source: 'manual' },
    ],
  });
  items.push({
    sku: DEMO_SKUS[10],
    quantity: 2,
    lastUpdated: now,
    history: [
      { timestamp: now, quantity: 2, source: 'manual' },
    ],
  });
  items.push({
    sku: DEMO_SKUS[13],
    quantity: 1,
    lastUpdated: now,
    history: [
      { timestamp: now, quantity: 1, source: 'manual' },
    ],
  });

  return items;
}

/**
 * Create an item with realistic consumption history
 */
function createItemWithHistory(
  sku: SKU,
  currentQty: number,
  startQty: number,
  now: Date
): InventoryItem {
  const history: Array<{ timestamp: Date; quantity: number; source: 'manual' | 'cv' | 'receipt' }> = [];
  const daysAgo = 7; // 7 days of history
  
  // Create history points showing gradual consumption
  const steps = 4;
  const qtyDecrement = (startQty - currentQty) / steps;
  
  for (let i = steps; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - (daysAgo * i / steps));
    const qty = currentQty + (qtyDecrement * i);
    
    history.push({
      timestamp: date,
      quantity: Math.max(0, qty),
      source: 'manual',
    });
  }

  return {
    sku,
    quantity: currentQty,
    lastUpdated: now,
    history,
  };
}

/**
 * Seed demo data into the app
 */
export async function seedDemoData(): Promise<void> {
  console.log('[DemoData] Seeding demo data...');

  try {
    // Generate demo inventory
    const demoItems = generateDemoInventory();

    // Store each item
    for (const item of demoItems) {
      await storageService.store(STORES.INVENTORY, item.sku.id, item);
      
      // Create audit log entry
      await storageService.appendAuditLog({
        timestamp: new Date(),
        type: 'inventory_update',
        data: {
          sku: item.sku,
          previousQuantity: 0,
          newQuantity: item.quantity,
          source: 'demo_data',
        },
        source: 'demo_data',
      });
    }

    console.log(`[DemoData] Successfully seeded ${demoItems.length} demo items`);
  } catch (error) {
    console.error('[DemoData] Error seeding demo data:', error);
    throw error;
  }
}

/**
 * Check if demo data already exists
 */
export async function hasDemoData(): Promise<boolean> {
  try {
    const inventory = await inventoryService.getInventory();
    return inventory.length > 0;
  } catch {
    return false;
  }
}

/**
 * Clear all demo data
 */
export async function clearDemoData(): Promise<void> {
  console.log('[DemoData] Clearing demo data...');
  
  try {
    const inventory = await inventoryService.getInventory();
    
    for (const item of inventory) {
      await inventoryService.deleteItem(item.sku.id);
    }
    
    console.log('[DemoData] Demo data cleared');
  } catch (error) {
    console.error('[DemoData] Error clearing demo data:', error);
    throw error;
  }
}
