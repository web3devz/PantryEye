import { openDB, IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, STORES, DBSchema } from './schema';

/**
 * IndexedDB wrapper for PantryEye
 * Provides type-safe access to encrypted storage
 */
class Database {
  private db: IDBPDatabase<DBSchema> | null = null;

  /**
   * Initialize and open the database
   */
  async init(): Promise<void> {
    this.db = await openDB<DBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create Inventory store
        if (!db.objectStoreNames.contains(STORES.INVENTORY)) {
          const inventoryStore = db.createObjectStore(STORES.INVENTORY, {
            keyPath: 'sku',
          });
          inventoryStore.createIndex('lastUpdated', 'lastUpdated');
        }

        // Create Audit Log store
        if (!db.objectStoreNames.contains(STORES.AUDIT_LOG)) {
          const auditLogStore = db.createObjectStore(STORES.AUDIT_LOG, {
            keyPath: 'id',
            autoIncrement: true,
          });
          auditLogStore.createIndex('timestamp', 'timestamp');
          auditLogStore.createIndex('type', 'type');
        }

        // Create User store
        if (!db.objectStoreNames.contains(STORES.USER)) {
          db.createObjectStore(STORES.USER, {
            keyPath: 'id',
          });
        }

        // Create SKU Mapping store
        if (!db.objectStoreNames.contains(STORES.SKU_MAPPING)) {
          db.createObjectStore(STORES.SKU_MAPPING, {
            keyPath: 'detectionClass',
          });
        }

        // Create Order store
        if (!db.objectStoreNames.contains(STORES.ORDER)) {
          const orderStore = db.createObjectStore(STORES.ORDER, {
            keyPath: 'orderId',
          });
          orderStore.createIndex('timestamp', 'timestamp');
          orderStore.createIndex('vendor', 'vendor');
        }
      },
    });
  }

  /**
   * Get the database instance
   */
  getDB(): IDBPDatabase<DBSchema> {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
export const database = new Database();
