/**
 * Authentication Service for PantryEye
 * Manages user authentication and encryption key derivation
 * Requirements: 1.1, 1.2, 1.4, 1.5
 */

import { UserMetadata } from '../../types';
import { cryptoService } from '../crypto/crypto';
import { storageService } from '../storage/storage';
import { database } from '../db/database';
import { STORES } from '../db/schema';

const USER_ID = 'current_user';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * AuthService class
 * Provides account creation, login, and authentication state management
 */
export class AuthService {
  private currentKey: CryptoKey | null = null;
  private sessionTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Create a new user account with password and metadata
   * Requirement 1.1: Prompt for account creation with password input
   * Requirement 1.2: Derive encryption keys from password
   * Requirement 1.4: Store household metadata in encrypted database
   * 
   * @param password - User password (minimum 8 characters)
   * @param metadata - User household metadata
   * @throws Error if account already exists or password is invalid
   */
  async createAccount(password: string, metadata: UserMetadata): Promise<void> {
    // Validate password
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Check if account already exists
    const db = database.getDB();
    const existingUser = await db.get(STORES.USER, USER_ID);
    if (existingUser) {
      throw new Error('Account already exists. Please login instead.');
    }

    // Generate salt for key derivation
    const salt = cryptoService.generateSalt();

    // Derive encryption key from password
    const key = await cryptoService.deriveKey(password, salt);

    // Set encryption key in storage service
    storageService.setEncryptionKey(key);

    // Convert Map to plain object for storage
    const metadataForStorage = {
      ...metadata,
      brandPreferences: Object.fromEntries(metadata.brandPreferences),
    };

    // Encrypt and store user metadata
    const encryptedMetadata = await cryptoService.encrypt(metadataForStorage, key);

    // Store user record with salt and encrypted metadata
    await db.put(STORES.USER, {
      id: USER_ID,
      salt: salt,
      encryptedMetadata: encryptedMetadata,
    });

    // Set current key and start session timer
    this.currentKey = key;
    this.startSessionTimer();
  }

  /**
   * Authenticate user and derive encryption keys
   * Requirement 1.5: Authenticate using password before granting access
   * Requirement 1.2: Derive encryption keys from password using key derivation function
   * 
   * @param password - User password
   * @returns CryptoKey for encryption/decryption operations
   * @throws Error if authentication fails
   */
  async login(password: string): Promise<CryptoKey> {
    // Get user record from database
    const db = database.getDB();
    const userRecord = await db.get(STORES.USER, USER_ID);

    if (!userRecord) {
      throw new Error('No account found. Please create an account first.');
    }

    // Derive key from password and stored salt
    const key = await cryptoService.deriveKey(password, userRecord.salt);

    // Verify password by attempting to decrypt metadata
    try {
      await cryptoService.decrypt(userRecord.encryptedMetadata, key);
    } catch (error) {
      throw new Error('Incorrect password');
    }

    // Set encryption key in storage service
    storageService.setEncryptionKey(key);

    // Set current key and start session timer
    this.currentKey = key;
    this.startSessionTimer();

    return key;
  }

  /**
   * Check if user is authenticated
   * Requirement 1.5: Authenticate using password before granting access
   * 
   * @returns true if user is authenticated, false otherwise
   */
  isAuthenticated(): boolean {
    return this.currentKey !== null && storageService.isAuthenticated();
  }

  /**
   * Get the current encryption key
   * @returns CryptoKey if authenticated, null otherwise
   */
  getCurrentKey(): CryptoKey | null {
    return this.currentKey;
  }

  /**
   * Get user metadata
   * @returns UserMetadata if authenticated
   * @throws Error if not authenticated
   */
  async getUserMetadata(): Promise<UserMetadata> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    const db = database.getDB();
    const userRecord = await db.get(STORES.USER, USER_ID);

    if (!userRecord || !this.currentKey) {
      throw new Error('User record not found');
    }

    // Decrypt metadata
    const decryptedMetadata = await cryptoService.decrypt(
      userRecord.encryptedMetadata,
      this.currentKey
    );

    // Convert plain object back to Map
    return {
      ...decryptedMetadata,
      brandPreferences: new Map(Object.entries(decryptedMetadata.brandPreferences || {})),
    };
  }

  /**
   * Update user metadata
   * @param metadata - Updated user metadata
   * @throws Error if not authenticated
   */
  async updateUserMetadata(metadata: UserMetadata): Promise<void> {
    if (!this.isAuthenticated() || !this.currentKey) {
      throw new Error('Not authenticated');
    }

    const db = database.getDB();
    const userRecord = await db.get(STORES.USER, USER_ID);

    if (!userRecord) {
      throw new Error('User record not found');
    }

    // Convert Map to plain object for storage
    const metadataForStorage = {
      ...metadata,
      brandPreferences: Object.fromEntries(metadata.brandPreferences),
    };

    // Encrypt updated metadata
    const encryptedMetadata = await cryptoService.encrypt(metadataForStorage, this.currentKey);

    // Update user record
    await db.put(STORES.USER, {
      id: USER_ID,
      salt: userRecord.salt,
      encryptedMetadata: encryptedMetadata,
    });
  }

  /**
   * Logout user and clear encryption keys
   * Requirement 1.5: Session management
   */
  logout(): void {
    // Clear encryption key from storage service
    storageService.clearEncryptionKey();

    // Clear current key
    this.currentKey = null;

    // Clear session timer
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  /**
   * Start session timeout timer
   * Requirement 1.5: Session timeout after 30 minutes
   */
  private startSessionTimer(): void {
    // Clear existing timer
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    // Set new timer
    this.sessionTimer = setTimeout(() => {
      this.logout();
    }, SESSION_TIMEOUT_MS);
  }

  /**
   * Reset session timer (call on user activity)
   */
  resetSessionTimer(): void {
    if (this.isAuthenticated()) {
      this.startSessionTimer();
    }
  }

  /**
   * Check if an account exists
   * @returns true if account exists, false otherwise
   */
  async accountExists(): Promise<boolean> {
    const db = database.getDB();
    const userRecord = await db.get(STORES.USER, USER_ID);
    return userRecord !== undefined;
  }
}

// Singleton instance
export const authService = new AuthService();
