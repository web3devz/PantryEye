/**
 * Storage Service for PantryEye
 * Manages encrypted storage operations using IndexedDB
 */

import { database } from '../db/database';
import { cryptoService } from '../crypto/crypto';
import { EncryptedData, STORES, AuditLogStore } from '../db/schema';

/**
 * Audit log entry types
 */
export type AuditLogType = 'inventory_update' | 'order_placed' | 'manual_edit' | 'feedback';

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  timestamp: Date;
  type: AuditLogType;
  data: any;
  source: string;
}

/**
 * Storage Service class
 * Provides encrypted storage and retrieval operations
 */
export class StorageService {
  private encryptionKey: CryptoKey | null = null;

  /**
   * Set the encryption key for storage operations
   * Must be called after user authentication
   */
  setEncryptionKey(key: CryptoKey): void {
    this.encryptionKey = key;
  }

  /**
   * Clear the encryption key (on logout)
   */
  clearEncryptionKey(): void {
    this.encryptionKey = null;
  }

  /**
   * Check if user is authenticated (has encryption key)
   */
  isAuthenticated(): boolean {
    return this.encryptionKey !== null;
  }

  /**
   * Get the encryption key, throwing if not authenticated
   */
  private getKey(): CryptoKey {
    if (!this.encryptionKey) {
      throw new Error('Not authenticated. Encryption key not available.');
    }
    return this.encryptionKey;
  }

  /**
   * Store encrypted data in a specific store
   * @param storeName - Name of the object store
   * @param key - Primary key for the record
   * @param data - Data to encrypt and store
   */
  async store(storeName: string, key: string, data: any): Promise<void> {
    const encryptionKey = this.getKey();
    const db = database.getDB();

    // Encrypt the data
    const encryptedData = await cryptoService.encrypt(data, encryptionKey);

    // Store based on store type
    switch (storeName) {
      case STORES.INVENTORY:
        await db.put(STORES.INVENTORY, {
          sku: key,
          encryptedData,
        });
        break;

      case STORES.SKU_MAPPING:
        await db.put(STORES.SKU_MAPPING, {
          detectionClass: key,
          encryptedData,
        });
        break;

      case STORES.ORDER:
        // For orders, we need timestamp and vendor from the data
        await db.put(STORES.ORDER, {
          orderId: key,
          timestamp: data.timestamp || new Date(),
          vendor: data.vendor || 'unknown',
          encryptedData,
        });
        break;

      case STORES.USER:
        // For user, we store salt separately
        await db.put(STORES.USER, {
          id: key,
          salt: data.salt || cryptoService.generateSalt(),
          encryptedMetadata: encryptedData,
        });
        break;

      default:
        throw new Error(`Unknown store: ${storeName}`);
    }
  }

  /**
   * Retrieve and decrypt data from a specific store
   * @param storeName - Name of the object store
   * @param key - Primary key for the record
   * @returns Decrypted data or null if not found
   */
  async retrieve(storeName: string, key: string): Promise<any> {
    const encryptionKey = this.getKey();
    const db = database.getDB();

    let encryptedData: EncryptedData | undefined;

    // Retrieve based on store type
    switch (storeName) {
      case STORES.INVENTORY: {
        const record = await db.get(STORES.INVENTORY, key);
        encryptedData = record?.encryptedData;
        break;
      }

      case STORES.SKU_MAPPING: {
        const record = await db.get(STORES.SKU_MAPPING, key);
        encryptedData = record?.encryptedData;
        break;
      }

      case STORES.ORDER: {
        const record = await db.get(STORES.ORDER, key);
        encryptedData = record?.encryptedData;
        break;
      }

      case STORES.USER: {
        const record = await db.get(STORES.USER, key);
        encryptedData = record?.encryptedMetadata;
        break;
      }

      default:
        throw new Error(`Unknown store: ${storeName}`);
    }

    if (!encryptedData) {
      return null;
    }

    // Decrypt and return
    return await cryptoService.decrypt(encryptedData, encryptionKey);
  }

  /**
   * Append entry to audit log
   * @param entry - Audit log entry to append
   * @returns The ID of the created audit log entry
   */
  async appendAuditLog(entry: AuditLogEntry): Promise<number> {
    const encryptionKey = this.getKey();
    const db = database.getDB();

    // Encrypt the entry data
    const encryptedData = await cryptoService.encrypt(entry.data, encryptionKey);

    // Create audit log store record
    const auditLogRecord: AuditLogStore = {
      timestamp: entry.timestamp,
      type: entry.type,
      encryptedData,
    };

    // Add to database (auto-increment ID)
    const id = await db.add(STORES.AUDIT_LOG, auditLogRecord);
    return id as number;
  }

  /**
   * Query audit log entries
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns Array of decrypted audit log entries
   */
  async getAuditLog(startDate?: Date, endDate?: Date): Promise<AuditLogEntry[]> {
    const encryptionKey = this.getKey();
    const db = database.getDB();

    // Get all audit log entries
    const tx = db.transaction(STORES.AUDIT_LOG, 'readonly');
    const index = tx.store.index('timestamp');
    
    let records: AuditLogStore[];
    
    if (startDate && endDate) {
      records = await index.getAll(IDBKeyRange.bound(startDate, endDate));
    } else if (startDate) {
      records = await index.getAll(IDBKeyRange.lowerBound(startDate));
    } else if (endDate) {
      records = await index.getAll(IDBKeyRange.upperBound(endDate));
    } else {
      records = await tx.store.getAll();
    }

    await tx.done;

    // Decrypt all entries
    const entries: AuditLogEntry[] = [];
    for (const record of records) {
      const decryptedData = await cryptoService.decrypt(record.encryptedData, encryptionKey);
      entries.push({
        timestamp: record.timestamp,
        type: record.type,
        data: decryptedData,
        source: decryptedData.source || 'unknown',
      });
    }

    return entries;
  }

  /**
   * Export audit log with passphrase protection
   * @param passphrase - User passphrase for export encryption
   * @returns Blob containing encrypted audit log
   */
  async exportAuditLog(passphrase: string): Promise<Blob> {
    // First, verify user is authenticated
    this.getKey();

    // Get all audit log entries (decrypted)
    const entries = await this.getAuditLog();

    // Re-encrypt with passphrase-derived key
    const exportSalt = cryptoService.generateSalt();
    const exportKey = await cryptoService.deriveKey(passphrase, exportSalt);
    const encryptedExport = await cryptoService.encrypt(entries, exportKey);

    // Create export object with salt and encrypted data
    const exportData = {
      version: 1,
      salt: Array.from(exportSalt),
      iv: Array.from(encryptedExport.iv),
      ciphertext: Array.from(new Uint8Array(encryptedExport.ciphertext)),
    };

    // Convert to JSON blob
    const jsonString = JSON.stringify(exportData, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  /**
   * Delete a record from a store
   * @param storeName - Name of the object store
   * @param key - Primary key for the record
   */
  async delete(storeName: string, key: string): Promise<void> {
    this.getKey(); // Verify authentication
    const db = database.getDB();

    switch (storeName) {
      case STORES.INVENTORY:
        await db.delete(STORES.INVENTORY, key);
        break;

      case STORES.SKU_MAPPING:
        await db.delete(STORES.SKU_MAPPING, key);
        break;

      case STORES.ORDER:
        await db.delete(STORES.ORDER, key);
        break;

      case STORES.USER:
        await db.delete(STORES.USER, key);
        break;

      default:
        throw new Error(`Unknown store: ${storeName}`);
    }
  }

  /**
   * Get all keys from a store
   * @param storeName - Name of the object store
   * @returns Array of keys
   */
  async getAllKeys(storeName: string): Promise<string[]> {
    this.getKey(); // Verify authentication
    const db = database.getDB();

    switch (storeName) {
      case STORES.INVENTORY:
        return (await db.getAllKeys(STORES.INVENTORY)) as string[];

      case STORES.SKU_MAPPING:
        return (await db.getAllKeys(STORES.SKU_MAPPING)) as string[];

      case STORES.ORDER:
        return (await db.getAllKeys(STORES.ORDER)) as string[];

      case STORES.USER:
        return (await db.getAllKeys(STORES.USER)) as string[];

      default:
        throw new Error(`Unknown store: ${storeName}`);
    }
  }
}

// Singleton instance
export const storageService = new StorageService();
