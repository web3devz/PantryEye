/**
 * Property-based tests for CryptoService
 * Tests encryption, decryption, and key derivation
 */

import { describe, it, expect } from 'vitest';
import { fc, TEST_CONFIG } from '../../test/setup';
import { CryptoService } from './crypto';
import { arbitraryPassword, arbitrarySalt, arbitraryDataObject } from '../../test/generators';

describe('CryptoService Property Tests', () => {
  const cryptoService = new CryptoService();

  /**
   * Feature: pantry-eye, Property 1: Encryption key derivation consistency
   * Validates: Requirements 1.2
   * 
   * For any password and salt combination, deriving encryption keys multiple times
   * should produce the same CryptoKey (with same key material)
   */
  it('Property 1: Key derivation should be consistent for same password and salt', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPassword(),
        arbitrarySalt(),
        async (password, salt) => {
          // Derive key twice with same password and salt
          const key1 = await cryptoService.deriveKey(password, salt);
          const key2 = await cryptoService.deriveKey(password, salt);

          // Export both keys to compare their raw key material
          const keyData1 = await crypto.subtle.exportKey('raw', key1);
          const keyData2 = await crypto.subtle.exportKey('raw', key2);

          // Convert to Uint8Array for comparison
          const keyArray1 = new Uint8Array(keyData1);
          const keyArray2 = new Uint8Array(keyData2);

          // Keys should be identical
          expect(keyArray1.length).toBe(keyArray2.length);
          expect(keyArray1.every((byte, i) => byte === keyArray2[i])).toBe(true);
        }
      ),
      TEST_CONFIG
    );
  });

  /**
   * Feature: pantry-eye, Property 2: Database encryption round-trip
   * Validates: Requirements 1.4, 3.5, 5.5, 8.3, 9.3, 9.4, 11.2
   * 
   * For any data object (inventory item, metadata, audit log entry, order),
   * encrypting and then decrypting should produce an equivalent object
   */
  it('Property 2: Encryption round-trip should preserve data', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPassword(),
        arbitrarySalt(),
        arbitraryDataObject(),
        async (password, salt, data) => {
          // Derive key from password
          const key = await cryptoService.deriveKey(password, salt);

          // Encrypt the data
          const encrypted = await cryptoService.encrypt(data, key);

          // Decrypt the data
          const decrypted = await cryptoService.decrypt(encrypted, key);

          // Decrypted data should equal original data
          expect(decrypted).toEqual(data);
        }
      ),
      TEST_CONFIG
    );
  });

  /**
   * Additional test: Verify encryption produces different ciphertexts for same data
   * (due to random IV generation)
   */
  it('Property: Encryption should produce different ciphertexts with different IVs', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPassword(),
        arbitrarySalt(),
        arbitraryDataObject(),
        async (password, salt, data) => {
          // Skip empty or trivial data that might have same representation
          if (data === null || data === undefined || data === '') {
            return true;
          }

          const key = await cryptoService.deriveKey(password, salt);

          // Encrypt same data twice
          const encrypted1 = await cryptoService.encrypt(data, key);
          const encrypted2 = await cryptoService.encrypt(data, key);

          // IVs should be different (random)
          const iv1 = new Uint8Array(encrypted1.iv);
          const iv2 = new Uint8Array(encrypted2.iv);
          const ivsAreDifferent = !iv1.every((byte, i) => byte === iv2[i]);

          // Ciphertexts should be different (due to different IVs)
          const cipher1 = new Uint8Array(encrypted1.ciphertext);
          const cipher2 = new Uint8Array(encrypted2.ciphertext);
          const ciphersAreDifferent = !cipher1.every((byte, i) => byte === cipher2[i]);

          expect(ivsAreDifferent || ciphersAreDifferent).toBe(true);
        }
      ),
      TEST_CONFIG
    );
  });
});
