/**
 * IndexedDB Schema for PantryEye
 * All data is stored encrypted using AES-GCM
 */

export const DB_NAME = 'PantryEyeDB';
export const DB_VERSION = 1;

/**
 * Object Store Names
 */
export const STORES = {
  INVENTORY: 'inventory',
  AUDIT_LOG: 'auditLog',
  USER: 'user',
  SKU_MAPPING: 'skuMapping',
  ORDER: 'order',
} as const;

/**
 * IndexedDB Schema Definition
 */
export interface DBSchema {
  inventory: {
    key: string; // SKU as primary key
    value: InventoryStore;
    indexes: {
      lastUpdated: Date;
    };
  };
  auditLog: {
    key: number; // Auto-increment
    value: AuditLogStore;
    indexes: {
      timestamp: Date;
      type: string;
    };
  };
  user: {
    key: string; // Always 'current_user'
    value: UserStore;
  };
  skuMapping: {
    key: string; // Detection class or receipt item name
    value: SKUMappingStore;
  };
  order: {
    key: string; // Order ID
    value: OrderStore;
    indexes: {
      timestamp: Date;
      vendor: string;
    };
  };
}

/**
 * Encrypted data wrapper
 */
export interface EncryptedData {
  ciphertext: ArrayBuffer;
  iv: Uint8Array<ArrayBuffer>;
  salt: Uint8Array<ArrayBuffer>;
}

/**
 * Store Interfaces
 */
export interface InventoryStore {
  sku: string;
  encryptedData: EncryptedData;
}

export interface AuditLogStore {
  id?: number; // Auto-increment
  timestamp: Date;
  type: 'inventory_update' | 'order_placed' | 'manual_edit' | 'feedback';
  encryptedData: EncryptedData;
}

export interface UserStore {
  id: string; // 'current_user'
  salt: Uint8Array<ArrayBuffer>;
  encryptedMetadata: EncryptedData;
}

export interface SKUMappingStore {
  detectionClass: string;
  encryptedData: EncryptedData;
}

export interface OrderStore {
  orderId: string;
  timestamp: Date;
  vendor: string;
  encryptedData: EncryptedData;
}
