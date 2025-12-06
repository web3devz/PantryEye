/**
 * Unit tests for AuthService
 * Tests account creation, login, authentication state, and session management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from './auth';
import { database } from '../db/database';
import { storageService } from '../storage/storage';
import { UserMetadata } from '../../types';
import { DB_NAME } from '../db/schema';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    // Close database if open
    try {
      database.close();
    } catch (e) {
      // Ignore if not open
    }

    // Delete the database to ensure clean state
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        console.warn('Database deletion blocked');
        resolve(); // Continue anyway
      };
    });

    // Reinitialize database
    await database.init();
    authService = new AuthService();
  });

  afterEach(async () => {
    // Clean up
    authService.logout();
    try {
      database.close();
    } catch (e) {
      // Ignore if already closed
    }
  });

  describe('createAccount', () => {
    it('should create a new account with valid password and metadata', async () => {
      const password = 'testpassword123';
      const metadata: UserMetadata = {
        householdMembers: 2,
        brandPreferences: new Map([['dairy', ['Organic Valley', 'Horizon']]]),
        spendingCap: 500,
        vendorAllowlist: ['amazon', 'walmart'],
      };

      await authService.createAccount(password, metadata);

      expect(authService.isAuthenticated()).toBe(true);
      expect(authService.getCurrentKey()).not.toBeNull();
    });

    it('should reject password shorter than 8 characters', async () => {
      const password = 'short';
      const metadata: UserMetadata = {
        householdMembers: 1,
        brandPreferences: new Map(),
        vendorAllowlist: ['amazon'],
      };

      await expect(authService.createAccount(password, metadata)).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });

    it('should reject creating account when one already exists', async () => {
      const password = 'testpassword123';
      const metadata: UserMetadata = {
        householdMembers: 1,
        brandPreferences: new Map(),
        vendorAllowlist: ['amazon'],
      };

      await authService.createAccount(password, metadata);

      // Try to create another account
      await expect(authService.createAccount(password, metadata)).rejects.toThrow(
        'Account already exists'
      );
    });

    it('should store metadata in encrypted form', async () => {
      const password = 'testpassword123';
      const metadata: UserMetadata = {
        householdMembers: 3,
        brandPreferences: new Map([
          ['dairy', ['Brand A']],
          ['produce', ['Brand B', 'Brand C']],
        ]),
        spendingCap: 1000,
        vendorAllowlist: ['walmart'],
      };

      await authService.createAccount(password, metadata);

      const retrievedMetadata = await authService.getUserMetadata();
      expect(retrievedMetadata.householdMembers).toBe(3);
      expect(retrievedMetadata.spendingCap).toBe(1000);
      expect(retrievedMetadata.vendorAllowlist).toEqual(['walmart']);
      expect(retrievedMetadata.brandPreferences.get('dairy')).toEqual(['Brand A']);
      expect(retrievedMetadata.brandPreferences.get('produce')).toEqual(['Brand B', 'Brand C']);
    });
  });

  describe('login', () => {
    const password = 'testpassword123';
    const metadata: UserMetadata = {
      householdMembers: 2,
      brandPreferences: new Map([['dairy', ['Organic Valley']]]),
      vendorAllowlist: ['amazon'],
    };

    beforeEach(async () => {
      // Create account first
      await authService.createAccount(password, metadata);
      authService.logout();
    });

    it('should login with correct password', async () => {
      const key = await authService.login(password);

      expect(key).not.toBeNull();
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should reject incorrect password', async () => {
      await expect(authService.login('wrongpassword')).rejects.toThrow('Incorrect password');
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should reject login when no account exists', async () => {
      // Close database
      database.close();

      // Delete the database to ensure clean state
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => resolve();
      });

      // Reinitialize database
      await database.init();

      const newAuthService = new AuthService();
      await expect(newAuthService.login(password)).rejects.toThrow(
        'No account found'
      );
    });

    it('should set encryption key in storage service after login', async () => {
      await authService.login(password);

      expect(storageService.isAuthenticated()).toBe(true);
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when not logged in', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return true after successful login', async () => {
      const password = 'testpassword123';
      const metadata: UserMetadata = {
        householdMembers: 1,
        brandPreferences: new Map(),
        vendorAllowlist: ['amazon'],
      };

      await authService.createAccount(password, metadata);
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false after logout', async () => {
      const password = 'testpassword123';
      const metadata: UserMetadata = {
        householdMembers: 1,
        brandPreferences: new Map(),
        vendorAllowlist: ['amazon'],
      };

      await authService.createAccount(password, metadata);
      authService.logout();
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('getUserMetadata', () => {
    it('should retrieve user metadata after authentication', async () => {
      const password = 'testpassword123';
      const metadata: UserMetadata = {
        householdMembers: 4,
        brandPreferences: new Map([['snacks', ['Brand X', 'Brand Y']]]),
        spendingCap: 750,
        vendorAllowlist: ['amazon', 'walmart'],
      };

      await authService.createAccount(password, metadata);
      const retrieved = await authService.getUserMetadata();

      expect(retrieved.householdMembers).toBe(4);
      expect(retrieved.spendingCap).toBe(750);
      expect(retrieved.brandPreferences.get('snacks')).toEqual(['Brand X', 'Brand Y']);
    });

    it('should throw error when not authenticated', async () => {
      await expect(authService.getUserMetadata()).rejects.toThrow('Not authenticated');
    });
  });

  describe('updateUserMetadata', () => {
    it('should update user metadata', async () => {
      const password = 'testpassword123';
      const metadata: UserMetadata = {
        householdMembers: 2,
        brandPreferences: new Map([['dairy', ['Brand A']]]),
        vendorAllowlist: ['amazon'],
      };

      await authService.createAccount(password, metadata);

      const updatedMetadata: UserMetadata = {
        householdMembers: 3,
        brandPreferences: new Map([['dairy', ['Brand B']]]),
        spendingCap: 600,
        vendorAllowlist: ['walmart'],
      };

      await authService.updateUserMetadata(updatedMetadata);

      const retrieved = await authService.getUserMetadata();
      expect(retrieved.householdMembers).toBe(3);
      expect(retrieved.spendingCap).toBe(600);
      expect(retrieved.brandPreferences.get('dairy')).toEqual(['Brand B']);
    });

    it('should throw error when not authenticated', async () => {
      const metadata: UserMetadata = {
        householdMembers: 1,
        brandPreferences: new Map(),
        vendorAllowlist: ['amazon'],
      };

      await expect(authService.updateUserMetadata(metadata)).rejects.toThrow(
        'Not authenticated'
      );
    });
  });

  describe('logout', () => {
    it('should clear authentication state', async () => {
      const password = 'testpassword123';
      const metadata: UserMetadata = {
        householdMembers: 1,
        brandPreferences: new Map(),
        vendorAllowlist: ['amazon'],
      };

      await authService.createAccount(password, metadata);
      expect(authService.isAuthenticated()).toBe(true);

      authService.logout();

      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getCurrentKey()).toBeNull();
      expect(storageService.isAuthenticated()).toBe(false);
    });
  });

  describe('accountExists', () => {
    it('should return false when no account exists', async () => {
      const exists = await authService.accountExists();
      expect(exists).toBe(false);
    });

    it('should return true after account creation', async () => {
      const password = 'testpassword123';
      const metadata: UserMetadata = {
        householdMembers: 1,
        brandPreferences: new Map(),
        vendorAllowlist: ['amazon'],
      };

      await authService.createAccount(password, metadata);

      const exists = await authService.accountExists();
      expect(exists).toBe(true);
    });
  });

  describe('session management', () => {
    it('should maintain session after login', async () => {
      const password = 'testpassword123';
      const metadata: UserMetadata = {
        householdMembers: 1,
        brandPreferences: new Map(),
        vendorAllowlist: ['amazon'],
      };

      await authService.createAccount(password, metadata);
      expect(authService.isAuthenticated()).toBe(true);

      // Session should still be active
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should allow session timer reset', async () => {
      const password = 'testpassword123';
      const metadata: UserMetadata = {
        householdMembers: 1,
        brandPreferences: new Map(),
        vendorAllowlist: ['amazon'],
      };

      await authService.createAccount(password, metadata);

      // Reset session timer (simulating user activity)
      authService.resetSessionTimer();

      expect(authService.isAuthenticated()).toBe(true);
    });
  });
});
