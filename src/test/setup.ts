/**
 * Vitest setup file
 * Runs before all tests
 */

// Mock IndexedDB for testing environment
import 'fake-indexeddb/auto';

// Configure fast-check for property-based testing
import fc from 'fast-check';

// Mock ImageData for testing environment (not available in Node.js)
if (typeof ImageData === 'undefined') {
  (globalThis as any).ImageData = class ImageData {
    width: number;
    height: number;
    data: Uint8ClampedArray;

    constructor(width: number, height: number);
    constructor(data: Uint8ClampedArray, width: number, height?: number);
    constructor(
      dataOrWidth: Uint8ClampedArray | number,
      widthOrHeight: number,
      height?: number
    ) {
      if (typeof dataOrWidth === 'number') {
        this.width = dataOrWidth;
        this.height = widthOrHeight;
        this.data = new Uint8ClampedArray(dataOrWidth * widthOrHeight * 4);
      } else {
        this.data = dataOrWidth;
        this.width = widthOrHeight;
        this.height = height || Math.floor(dataOrWidth.length / (widthOrHeight * 4));
      }
    }
  };
}

// Global test configuration
export const TEST_CONFIG = {
  // Run 100+ iterations for all property-based tests
  numRuns: 100,
  // Seed for reproducible tests (optional)
  seed: undefined,
};

// Export fast-check with default configuration
export { fc };
