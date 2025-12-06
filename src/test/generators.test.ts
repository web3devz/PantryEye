import { describe, it } from 'vitest';
import fc from 'fast-check';
import { TEST_CONFIG } from './setup';
import {
  arbitraryPassword,
  arbitrarySalt,
  arbitraryIV,
  arbitrarySKU,
  arbitraryQuantity,
  arbitraryConfidence,
  arbitraryFillLevel,
  arbitraryPrice,
} from './generators';

describe('Property-based testing generators', () => {
  it('should generate valid passwords', () => {
    fc.assert(
      fc.property(arbitraryPassword(), (password) => {
        return password.length >= 8 && password.length <= 32;
      }),
      TEST_CONFIG
    );
  });

  it('should generate valid salts (16 bytes)', () => {
    fc.assert(
      fc.property(arbitrarySalt(), (salt) => {
        return salt.length === 16;
      }),
      TEST_CONFIG
    );
  });

  it('should generate valid IVs (12 bytes)', () => {
    fc.assert(
      fc.property(arbitraryIV(), (iv) => {
        return iv.length === 12;
      }),
      TEST_CONFIG
    );
  });

  it('should generate valid SKUs', () => {
    fc.assert(
      fc.property(arbitrarySKU(), (sku) => {
        return sku.length >= 3 && sku.length <= 20;
      }),
      TEST_CONFIG
    );
  });

  it('should generate valid quantities (0-100)', () => {
    fc.assert(
      fc.property(arbitraryQuantity(), (quantity) => {
        return quantity >= 0 && quantity <= 100;
      }),
      TEST_CONFIG
    );
  });

  it('should generate valid confidence scores (0-1)', () => {
    fc.assert(
      fc.property(arbitraryConfidence(), (confidence) => {
        return confidence >= 0 && confidence <= 1;
      }),
      TEST_CONFIG
    );
  });

  it('should generate valid fill levels (0-100)', () => {
    fc.assert(
      fc.property(arbitraryFillLevel(), (fillLevel) => {
        return fillLevel >= 0 && fillLevel <= 100;
      }),
      TEST_CONFIG
    );
  });

  it('should generate valid prices', () => {
    fc.assert(
      fc.property(arbitraryPrice(), (price) => {
        return price >= 0.01 && price <= 999.99;
      }),
      TEST_CONFIG
    );
  });
});
