import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { database } from './database';
import { STORES } from './schema';

describe('Database', () => {
  beforeEach(async () => {
    await database.init();
  });

  afterEach(() => {
    database.close();
  });

  it('should initialize database successfully', async () => {
    const db = database.getDB();
    expect(db).toBeDefined();
    expect(db.name).toBe('PantryEyeDB');
  });

  it('should create all required object stores', async () => {
    const db = database.getDB();
    const storeNames = Array.from(db.objectStoreNames);
    
    expect(storeNames).toContain(STORES.INVENTORY);
    expect(storeNames).toContain(STORES.AUDIT_LOG);
    expect(storeNames).toContain(STORES.USER);
    expect(storeNames).toContain(STORES.SKU_MAPPING);
    expect(storeNames).toContain(STORES.ORDER);
  });

  it('should throw error when accessing DB before initialization', () => {
    const uninitializedDB = new (database.constructor as any)();
    expect(() => uninitializedDB.getDB()).toThrow('Database not initialized');
  });
});
