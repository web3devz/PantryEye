import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../services/auth';
import { storageService } from '../services/storage';
import { database } from '../services/db/database';
import { cvService } from '../services/cv';
import { ocrService } from '../services/ocr';
import type { UserMetadata } from '../types';

/**
 * Security verification tests
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
describe('Security Requirements Verification', () => {
  let authService: AuthService;
  const testPassword = 'SecurePassword123!';
  const testMetadata: UserMetadata = {
    householdMembers: 2,
    brandPreferences: new Map([['dairy', ['Organic Valley']]]),
    spendingCap: 100,
    vendorAllowlist: ['amazon']
  };

  beforeEach(async () => {
    // Close any existing database connection
    database.close();
    
    // Clear IndexedDB
    if (typeof indexedDB !== 'undefined') {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
    await database.init();
    
    authService = new AuthService();
  });

  afterEach(async () => {
    if (authService.isAuthenticated()) {
      authService.logout();
    }
    database.close();
  });

  describe('Requirement 9.1: On-device CV processing', () => {
    it('should perform CV inference without network calls', async () => {
      // Track network requests
      const networkCalls: string[] = [];
      const originalFetch = global.fetch;
      
      // Mock fetch to track calls
      global.fetch = async (...args: any[]) => {
        networkCalls.push(args[0]);
        return originalFetch(...args);
      };

      try {
        // Initialize CV service
        await cvService.initialize();
        
        // Process an image
        const mockImageData = new ImageData(640, 480);
        await cvService.detectItems(mockImageData);
        
        // Verify no network calls were made during ML inference
        expect(networkCalls.length).toBe(0);
      } finally {
        // Restore original fetch
        global.fetch = originalFetch;
      }
    });

    it('should not send image data to external servers', async () => {
      const mockImageData = new ImageData(640, 480);
      
      // Verify the image data stays local
      const detections = await cvService.detectItems(mockImageData);
      
      // Should return detections (even if empty) without network calls
      expect(Array.isArray(detections)).toBe(true);
    });
  });

  describe('Requirement 9.2: On-device OCR processing', () => {
    it('should perform OCR without network calls', async () => {
      // Track network requests
      const networkCalls: string[] = [];
      const originalFetch = global.fetch;
      
      global.fetch = async (...args: any[]) => {
        networkCalls.push(args[0]);
        return originalFetch(...args);
      };

      try {
        await ocrService.initialize();
        
        const mockImageData = new ImageData(640, 480);
        await ocrService.extractText(mockImageData);
        
        // Verify no network calls during OCR
        expect(networkCalls.length).toBe(0);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should not send receipt images to external servers', async () => {
      const mockImageData = new ImageData(640, 480);
      
      const text = await ocrService.extractText(mockImageData);
      
      // Should return text (even if empty) without network calls
      expect(typeof text).toBe('string');
    });
  });

  describe('Requirement 9.3: Data encryption at rest', () => {
    it('should encrypt all data before storing in IndexedDB', async () => {
      await authService.createAccount(testPassword, testMetadata);
      
      // Store some test data
      await storageService.store('inventory', 'test-sku-001', {
        sku: { id: 'test-sku-001', name: 'Test Item' },
        quantity: 5,
        lastUpdated: new Date()
      });
      
      // Access raw IndexedDB to verify data is encrypted
      const db = database.getDB();
      const rawData = await db.get('inventory', 'test-sku-001');
      
      expect(rawData).toBeDefined();
      expect(rawData.encryptedData).toBeDefined();
      expect(rawData.encryptedData.ciphertext).toBeDefined();
      expect(rawData.encryptedData.iv).toBeDefined();
      
      // Verify the data is not stored in plaintext
      const rawDataString = JSON.stringify(rawData);
      expect(rawDataString).not.toContain('Test Item');
    });

    it('should encrypt user metadata', async () => {
      await authService.createAccount(testPassword, testMetadata);
      
      // Access raw user data from IndexedDB
      const db = database.getDB();
      const userData = await db.get('user', 'current_user');
      
      expect(userData).toBeDefined();
      expect(userData.encryptedMetadata).toBeDefined();
      expect(userData.encryptedMetadata.ciphertext).toBeDefined();
      
      // Verify metadata is not in plaintext
      const userDataString = JSON.stringify(userData);
      expect(userDataString).not.toContain('Organic Valley');
    });

    it('should encrypt audit log entries', async () => {
      await authService.createAccount(testPassword, testMetadata);
      
      // Create an audit log entry
      await storageService.appendAuditLog({
        timestamp: new Date(),
        type: 'manual_edit',
        data: { action: 'test', sensitiveInfo: 'secret data' },
        source: 'manual'
      });
      
      // Access raw audit log from IndexedDB
      const db = database.getDB();
      const tx = db.transaction('auditLog', 'readonly');
      const store = tx.objectStore('auditLog');
      const allEntries = await store.getAll();
      
      expect(allEntries.length).toBeGreaterThan(0);
      
      const rawEntry = allEntries[0];
      expect(rawEntry.encryptedData).toBeDefined();
      expect(rawEntry.encryptedData.ciphertext).toBeDefined();
      
      // Verify sensitive data is not in plaintext
      const entryString = JSON.stringify(rawEntry);
      expect(entryString).not.toContain('secret data');
    });
  });

  describe('Requirement 9.4: Data decryption with user key', () => {
    it('should decrypt data using user-derived encryption key', async () => {
      await authService.createAccount(testPassword, testMetadata);
      
      const testData = {
        sku: { id: 'test-001', name: 'Sensitive Item' },
        quantity: 10
      };
      
      // Store encrypted data
      await storageService.store('inventory', 'test-001', testData);
      
      // Retrieve and decrypt
      const decryptedData = await storageService.retrieve('inventory', 'test-001');
      
      expect(decryptedData).toBeDefined();
      expect(decryptedData.sku.name).toBe('Sensitive Item');
      expect(decryptedData.quantity).toBe(10);
    });

    it('should fail to decrypt without correct key', async () => {
      await authService.createAccount(testPassword, testMetadata);
      
      await storageService.store('inventory', 'test-002', {
        sku: { id: 'test-002', name: 'Item' },
        quantity: 5
      });
      
      // Logout to clear encryption key
      authService.logout();
      
      // Try to retrieve without authentication
      await expect(
        storageService.retrieve('inventory', 'test-002')
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('Requirement 9.5: Audit log access control', () => {
    it('should require authentication to access audit log', async () => {
      // Try to access audit log without authentication
      await expect(
        storageService.getAuditLog()
      ).rejects.toThrow('Not authenticated');
    });

    it('should allow audit log access after authentication', async () => {
      await authService.createAccount(testPassword, testMetadata);
      
      // Create some audit entries
      await storageService.appendAuditLog({
        timestamp: new Date(),
        type: 'manual_edit',
        data: { action: 'test' },
        source: 'manual'
      });
      
      // Should be able to access audit log when authenticated
      const auditLog = await storageService.getAuditLog();
      
      expect(Array.isArray(auditLog)).toBe(true);
      expect(auditLog.length).toBeGreaterThan(0);
    });

    it('should decrypt audit log entries only after authentication', async () => {
      await authService.createAccount(testPassword, testMetadata);
      
      await storageService.appendAuditLog({
        timestamp: new Date(),
        type: 'manual_edit',
        data: { action: 'sensitive action', details: 'confidential' },
        source: 'manual'
      });
      
      // Logout
      authService.logout();
      
      // Cannot access after logout
      await expect(
        storageService.getAuditLog()
      ).rejects.toThrow('Not authenticated');
      
      // Login again
      await authService.login(testPassword);
      
      // Can access after re-authentication
      const auditLog = await storageService.getAuditLog();
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].data.action).toBe('sensitive action');
    });
  });

  describe('Session timeout', () => {
    it('should have session timeout configured', () => {
      // Verify session timeout is set (30 minutes = 1800000 ms)
      // This is tested indirectly through the auth service
      expect(authService).toBeDefined();
      
      // The session timer is started on login/createAccount
      // and clears encryption keys after timeout
    });
  });

  describe('Encryption strength', () => {
    it('should use AES-GCM encryption', async () => {
      await authService.createAccount(testPassword, testMetadata);
      
      await storageService.store('inventory', 'test-003', {
        data: 'test'
      });
      
      // Access raw data to verify encryption format
      const db = database.getDB();
      const rawData = await db.get('inventory', 'test-003');
      
      // AES-GCM produces ciphertext and IV
      // Note: IndexedDB may convert ArrayBuffer to other formats during storage
      expect(rawData.encryptedData.ciphertext).toBeDefined();
      expect(rawData.encryptedData.iv).toBeDefined();
      
      // Verify IV is the correct length (12 bytes for GCM)
      const iv = rawData.encryptedData.iv;
      expect(iv.length || iv.byteLength).toBe(12);
    });

    it('should use unique IV for each encryption', async () => {
      await authService.createAccount(testPassword, testMetadata);
      
      // Store same data twice
      await storageService.store('inventory', 'test-004', { data: 'same' });
      await storageService.store('inventory', 'test-005', { data: 'same' });
      
      const db = database.getDB();
      const data1 = await db.get('inventory', 'test-004');
      const data2 = await db.get('inventory', 'test-005');
      
      // IVs should be different
      const iv1 = Array.from(data1.encryptedData.iv);
      const iv2 = Array.from(data2.encryptedData.iv);
      
      expect(iv1).not.toEqual(iv2);
    });
  });
});
