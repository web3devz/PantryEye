/**
 * Property-based testing generators
 * Used with fast-check for generating random test data
 */
import fc from 'fast-check';

/**
 * Generate random passwords (8-32 characters)
 */
export const arbitraryPassword = (): fc.Arbitrary<string> => {
  return fc.string({ minLength: 8, maxLength: 32 });
};

/**
 * Generate random salt (16 bytes)
 */
export const arbitrarySalt = (): fc.Arbitrary<Uint8Array<ArrayBuffer>> => {
  return fc.uint8Array({ minLength: 16, maxLength: 16 }) as fc.Arbitrary<Uint8Array<ArrayBuffer>>;
};

/**
 * Generate random IV (12 bytes for AES-GCM)
 */
export const arbitraryIV = (): fc.Arbitrary<Uint8Array<ArrayBuffer>> => {
  return fc.uint8Array({ minLength: 12, maxLength: 12 }) as fc.Arbitrary<Uint8Array<ArrayBuffer>>;
};

/**
 * Generate random SKU
 */
export const arbitrarySKU = (): fc.Arbitrary<string> => {
  return fc.string({ minLength: 3, maxLength: 20 });
};

/**
 * Generate random quantity (0-100)
 */
export const arbitraryQuantity = (): fc.Arbitrary<number> => {
  return fc.integer({ min: 0, max: 100 });
};

/**
 * Generate random timestamp
 */
export const arbitraryTimestamp = (): fc.Arbitrary<Date> => {
  return fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') });
};

/**
 * Generate random confidence score (0-1)
 */
export const arbitraryConfidence = (): fc.Arbitrary<number> => {
  return fc.double({ min: 0, max: 1, noNaN: true });
};

/**
 * Generate random fill level (0-100)
 */
export const arbitraryFillLevel = (): fc.Arbitrary<number> => {
  return fc.integer({ min: 0, max: 100 });
};

/**
 * Generate random price
 */
export const arbitraryPrice = (): fc.Arbitrary<number> => {
  return fc.double({ min: 0.01, max: 999.99, noNaN: true });
};

/**
 * Generate random brand name
 */
export const arbitraryBrand = (): fc.Arbitrary<string> => {
  return fc.constantFrom(
    'Generic',
    'BrandA',
    'BrandB',
    'BrandC',
    'Premium',
    'Store Brand'
  );
};

/**
 * Generate random vendor
 */
export const arbitraryVendor = (): fc.Arbitrary<string> => {
  return fc.constantFrom('amazon', 'walmart');
};

/**
 * Generate random data object for encryption testing
 * Excludes non-JSON-serializable values (NaN, Infinity, -Infinity)
 */
export const arbitraryDataObject = (): fc.Arbitrary<any> => {
  return fc.oneof(
    fc.string(),
    fc.integer(),
    fc.double({ noNaN: true }).filter(n => isFinite(n)), // Exclude NaN and Infinity
    fc.boolean(),
    fc.array(fc.string()),
    fc.record({
      name: fc.string(),
      value: fc.integer(),
      nested: fc.record({
        field: fc.string(),
      }),
    })
  );
};
