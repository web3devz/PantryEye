/**
 * Crypto Service for PantryEye
 * Handles encryption/decryption using AES-GCM and key derivation using PBKDF2
 */

import { EncryptedData } from '../db/schema';

/**
 * Crypto configuration constants
 */
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16; // bytes
const IV_LENGTH = 12; // bytes for AES-GCM
const KEY_LENGTH = 256; // bits

/**
 * CryptoService class
 * Provides encryption, decryption, and key derivation functionality
 */
export class CryptoService {
  /**
   * Generate a random salt for key derivation
   * @returns Uint8Array of random bytes
   */
  generateSalt(): Uint8Array<ArrayBuffer> {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  }

  /**
   * Generate a random IV for encryption
   * @returns Uint8Array of random bytes
   */
  generateIV(): Uint8Array<ArrayBuffer> {
    return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  }

  /**
   * Derive encryption key from password using PBKDF2
   * @param password - User password
   * @param salt - Salt for key derivation
   * @param iterations - Number of PBKDF2 iterations (default: 100,000)
   * @returns CryptoKey for AES-GCM encryption
   */
  async deriveKey(
    password: string,
    salt: Uint8Array<ArrayBuffer>,
    iterations: number = PBKDF2_ITERATIONS
  ): Promise<CryptoKey> {
    // Convert password to key material
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive key using PBKDF2
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: KEY_LENGTH,
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );

    return key;
  }

  /**
   * Encrypt data using AES-GCM
   * @param data - Data to encrypt (will be JSON stringified)
   * @param key - CryptoKey for encryption
   * @returns EncryptedData containing ciphertext, IV, and salt
   */
  async encrypt(data: any, key: CryptoKey): Promise<EncryptedData> {
    // Generate random IV
    const iv = this.generateIV();
    
    // Convert data to JSON string then to ArrayBuffer
    const encoder = new TextEncoder();
    const dataString = JSON.stringify(data);
    const dataBuffer = encoder.encode(dataString);

    // Encrypt using AES-GCM
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      dataBuffer
    );

    // Get salt from key (we'll need to pass it separately in practice)
    // For now, generate a new salt for storage
    const salt = this.generateSalt();

    return {
      ciphertext,
      iv,
      salt,
    };
  }

  /**
   * Decrypt data using AES-GCM
   * @param encryptedData - EncryptedData containing ciphertext, IV, and salt
   * @param key - CryptoKey for decryption
   * @returns Decrypted data (parsed from JSON)
   */
  async decrypt(encryptedData: EncryptedData, key: CryptoKey): Promise<any> {
    // Decrypt using AES-GCM
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: encryptedData.iv as BufferSource,
      },
      key,
      encryptedData.ciphertext
    );

    // Convert ArrayBuffer back to string and parse JSON
    const decoder = new TextDecoder();
    const dataString = decoder.decode(decryptedBuffer);
    const data = JSON.parse(dataString);

    return data;
  }
}

// Singleton instance
export const cryptoService = new CryptoService();
