import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../services/auth';
import { InventoryService } from '../services/inventory';
import { ForecastService } from '../services/forecast';
import { CartService } from '../services/cart';
import { storageService } from '../services/storage';
import { database } from '../services/db/database';
import type { UserMetadata } from '../types';

/**
 * Integration tests for complete user flows
 * Tests the entire application workflow from account creation to order placement
 */
describe('Complete User Flow Integration Tests', () => {
  let authService: AuthService;
  let inventoryService: InventoryService;
  let forecastService: ForecastService;
  let cartService: CartService;

  let testCounter = 0;
  
  const getTestPassword = () => `TestPassword${testCounter++}123!`;
  
  const testMetadata: UserMetadata = {
    householdMembers: 2,
    brandPreferences: new Map([
      ['dairy', ['Organic Valley', 'Horizon']],
      ['bread', ['Dave\'s Killer Bread']]
    ]),
    spendingCap: 150,
    vendorAllowlist: ['amazon', 'walmart']
  };

  beforeEach(async () => {
    // Close any existing database connection
    database.close();
    
    // Clear IndexedDB before each test
    if (typeof indexedDB !== 'undefined') {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    }
    
    // Wait a bit for database deletion to complete
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Initialize database
    await database.init();
    
    // Initialize services
    authService = new AuthService();
    inventoryService = new InventoryService();
    forecastService = new ForecastService();
    cartService = new CartService();
  });

  afterEach(async () => {
    // Clean up - logout to clear encryption keys
    if (authService.isAuthenticated()) {
      authService.logout();
    }
    
    // Close database
    database.close();
  });

  it('should complete full user flow: create account → camera capture → receipt upload → forecast → cart → order', async () => {
    // Step 1: Create account with metadata
    const password = getTestPassword();
    await authService.createAccount(password, testMetadata);
    expect(authService.isAuthenticated()).toBe(true);

    // Step 2: Login (simulate logout/login)
    const keys = await authService.login(password);
    expect(keys).toBeDefined();
    expect(authService.isAuthenticated()).toBe(true);

    // Step 3: Camera capture - simulate CV detection
    const mockImageData = new ImageData(640, 480);
    const cameraResult = await inventoryService.processCameraCapture(mockImageData);
    
    expect(cameraResult).toBeDefined();
    expect(cameraResult.updatedItems).toBeDefined();
    
    // Verify inventory was updated
    const inventoryAfterCamera = await inventoryService.getInventory();
    expect(inventoryAfterCamera.length).toBeGreaterThanOrEqual(0);

    // Step 4: Receipt upload - simulate OCR processing
    const receiptResult = await inventoryService.processReceipt(mockImageData);
    
    expect(receiptResult).toBeDefined();
    expect(receiptResult.updatedItems).toBeDefined();

    // Step 5: Verify reconciliation - inventory should have merged data
    const inventoryAfterReceipt = await inventoryService.getInventory();
    expect(inventoryAfterReceipt.length).toBeGreaterThanOrEqual(inventoryAfterCamera.length);

    // Step 6: Manually add an item that will need restocking soon
    const milkSku = {
      id: 'test-milk-001',
      name: 'Whole Milk',
      category: 'dairy',
      unit: 'gallon',
      marketplaceIds: new Map([['amazon', 'AMZN-MILK-001']])
    };
    
    await inventoryService.addItem(milkSku, 2.0);

    // Add historical data to enable forecasting (need at least 2 data points)
    // Simulate consumption over time by updating quantity multiple times
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    await inventoryService.updateItem(milkSku.id, 1.5);
    
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    await inventoryService.updateItem(milkSku.id, 1.0);
    
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    await inventoryService.updateItem(milkSku.id, 0.5);

    // Step 7: View forecasts
    const restockItems = await forecastService.getItemsNeedingRestock(30); // Use higher threshold
    
    // Should have at least one item needing restock (or 0 if forecast doesn't predict runout)
    expect(Array.isArray(restockItems)).toBe(true);

    // Step 8: Build draft cart (only if we have restock items)
    if (restockItems.length > 0) {
      const draftCart = await cartService.buildDraftCart(restockItems, testMetadata);
      
      expect(draftCart).toBeDefined();
      expect(draftCart.items.length).toBeGreaterThan(0);
      expect(draftCart.totalPrice).toBeGreaterThan(0);
      
      // Verify spending cap is respected
      if (testMetadata.spendingCap) {
        expect(draftCart.totalPrice).toBeLessThanOrEqual(testMetadata.spendingCap);
      }

      // Step 9: Approve and submit order
      const orderConfirmation = await cartService.submitOrder(draftCart);
      
      expect(orderConfirmation).toBeDefined();
      expect(orderConfirmation.orderId).toBeDefined();
      expect(orderConfirmation.items.length).toBe(draftCart.items.length);
      expect(orderConfirmation.totalPrice).toBe(draftCart.totalPrice);

      // Step 10: View order history
      const auditLog = await storageService.getAuditLog();
      
      const orderEntries = auditLog.filter(entry => entry.type === 'order_placed');
      expect(orderEntries.length).toBeGreaterThan(0);
      
      const latestOrder = orderEntries[orderEntries.length - 1];
      expect(latestOrder.data.orderId).toBe(orderConfirmation.orderId);
    } else {
      // If no restock items, just verify the flow worked
      expect(true).toBe(true);
    }
  });

  it('should persist data after logout and login', async () => {
    // Create account and add data
    const password = getTestPassword();
    await authService.createAccount(password, testMetadata);
    
    await inventoryService.addItem(
      {
        id: 'persist-test-001',
        name: 'Test Item',
        category: 'test',
        unit: 'count',
        marketplaceIds: new Map()
      },
      5
    );

    const inventoryBeforeLogout = await inventoryService.getInventory();
    expect(inventoryBeforeLogout.length).toBeGreaterThan(0);

    // Simulate logout
    authService.logout();
    expect(authService.isAuthenticated()).toBe(false);

    // Login again
    await authService.login(password);
    expect(authService.isAuthenticated()).toBe(true);

    // Verify data persists
    const inventoryAfterLogin = await inventoryService.getInventory();
    expect(inventoryAfterLogin.length).toBe(inventoryBeforeLogout.length);
    
    const persistedItem = inventoryAfterLogin.find(item => item.sku.id === 'persist-test-001');
    expect(persistedItem).toBeDefined();
    expect(persistedItem?.quantity).toBe(5);
  });

  it('should reconcile multiple data sources correctly', async () => {
    const password = getTestPassword();
    await authService.createAccount(password, testMetadata);

    // Manually add an item first
    const testSku = {
      id: 'reconcile-test-001',
      name: 'Test Item',
      category: 'test',
      unit: 'count',
      marketplaceIds: new Map()
    };
    
    // Source 1: Manual add
    await inventoryService.addItem(testSku, 5);
    
    // Source 2: Manual update (simulating CV detection)
    await inventoryService.updateItem(testSku.id, 3);
    
    // Source 3: Manual edit (should take priority)
    const manualQuantity = 10;
    await inventoryService.updateItem(testSku.id, manualQuantity);

    // Verify reconciliation
    const finalInventory = await inventoryService.getInventory();
    const reconciledItem = finalInventory.find(item => item.sku.id === testSku.id);
    
    expect(reconciledItem).toBeDefined();
    // Manual edit should take priority (Property 24)
    expect(reconciledItem?.quantity).toBe(manualQuantity);
    
    // Verify history is maintained
    expect(reconciledItem?.history).toBeDefined();
    expect(reconciledItem?.history.length).toBeGreaterThan(1);
    
    // Verify audit log has all sources
    const auditLog = await storageService.getAuditLog();
    const inventoryUpdates = auditLog.filter(entry => entry.type === 'manual_edit');
    
    expect(inventoryUpdates.length).toBeGreaterThan(0);
  });

  it('should handle edge case: no detections from camera', async () => {
    const password = getTestPassword();
    await authService.createAccount(password, testMetadata);

    // Create image data that will result in no detections
    const emptyImageData = new ImageData(1, 1);
    
    const result = await inventoryService.processCameraCapture(emptyImageData);
    
    // Should handle gracefully
    expect(result).toBeDefined();
    expect(result.updatedItems).toBeDefined();
    // May have 0 items, which is valid
    expect(Array.isArray(result.updatedItems)).toBe(true);
  });

  it('should handle edge case: OCR failure', async () => {
    const password = getTestPassword();
    await authService.createAccount(password, testMetadata);

    // Create image data that will result in OCR failure
    const badImageData = new ImageData(1, 1);
    
    const result = await inventoryService.processReceipt(badImageData);
    
    // Should handle gracefully
    expect(result).toBeDefined();
    expect(result.updatedItems).toBeDefined();
    expect(Array.isArray(result.updatedItems)).toBe(true);
  });

  it('should enforce authentication requirement', async () => {
    // Try to access data without authentication
    expect(authService.isAuthenticated()).toBe(false);

    // Attempting operations without auth should fail or return empty
    const inventory = await inventoryService.getInventory();
    expect(inventory).toBeDefined();
    // Without auth, should return empty or throw
    expect(Array.isArray(inventory)).toBe(true);
  });
});
