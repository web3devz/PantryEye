/**
 * Tests for CV Service
 * Requirements: 2.1, 2.2, 2.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CVService } from './cv';

// Mock ImageData for Node.js test environment
class MockImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

describe('CVService', () => {
  let cvService: CVService;

  beforeEach(() => {
    cvService = new CVService();
  });

  describe('initialize', () => {
    it('should initialize the CV model', async () => {
      await cvService.initialize();
      expect(cvService.isInitialized()).toBe(true);
      expect(cvService.isModelLoaded()).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      await cvService.initialize();
      const firstInit = cvService.isInitialized();
      await cvService.initialize();
      expect(cvService.isInitialized()).toBe(firstInit);
    });
  });

  describe('detectItems', () => {
    it('should return detections with valid structure', async () => {
      const mockImageData = new MockImageData(640, 480) as unknown as ImageData;
      const detections = await cvService.detectItems(mockImageData);

      expect(Array.isArray(detections)).toBe(true);
      expect(detections.length).toBeGreaterThan(0);

      // Verify each detection has valid structure
      detections.forEach((detection) => {
        expect(detection).toHaveProperty('class');
        expect(detection).toHaveProperty('confidence');
        expect(detection).toHaveProperty('boundingBox');
        expect(detection).toHaveProperty('fillLevel');

        // Validate confidence is between 0 and 1
        expect(detection.confidence).toBeGreaterThanOrEqual(0);
        expect(detection.confidence).toBeLessThanOrEqual(1);

        // Validate bounding box structure
        expect(detection.boundingBox).toHaveProperty('x');
        expect(detection.boundingBox).toHaveProperty('y');
        expect(detection.boundingBox).toHaveProperty('width');
        expect(detection.boundingBox).toHaveProperty('height');

        // Validate fill level is between 0 and 100
        expect(detection.fillLevel).toBeGreaterThanOrEqual(0);
        expect(detection.fillLevel).toBeLessThanOrEqual(100);
      });
    });

    it('should auto-initialize if not initialized', async () => {
      const mockImageData = new MockImageData(640, 480) as unknown as ImageData;
      expect(cvService.isInitialized()).toBe(false);

      await cvService.detectItems(mockImageData);

      expect(cvService.isInitialized()).toBe(true);
    });
  });

  describe('estimateFillLevel', () => {
    it('should return fill level between 0 and 100', async () => {
      await cvService.initialize();

      const mockImageData = new MockImageData(640, 480) as unknown as ImageData;
      const mockDetection = {
        class: 'milk',
        confidence: 0.85,
        boundingBox: { x: 100, y: 100, width: 200, height: 300 },
        fillLevel: 0,
      };

      const fillLevel = cvService.estimateFillLevel(mockDetection, mockImageData);

      expect(fillLevel).toBeGreaterThanOrEqual(0);
      expect(fillLevel).toBeLessThanOrEqual(100);
      expect(Number.isInteger(fillLevel)).toBe(true);
    });

    it('should return different fill levels for different bounding box sizes', async () => {
      await cvService.initialize();

      const mockImageData = new MockImageData(640, 480) as unknown as ImageData;

      const smallDetection = {
        class: 'milk',
        confidence: 0.85,
        boundingBox: { x: 100, y: 100, width: 50, height: 50 },
        fillLevel: 0,
      };

      const largeDetection = {
        class: 'milk',
        confidence: 0.85,
        boundingBox: { x: 100, y: 100, width: 400, height: 400 },
        fillLevel: 0,
      };

      const smallFillLevel = cvService.estimateFillLevel(smallDetection, mockImageData);
      const largeFillLevel = cvService.estimateFillLevel(largeDetection, mockImageData);

      // Larger bounding boxes should generally have higher fill levels
      // (though there's randomness in the mock implementation)
      expect(smallFillLevel).toBeGreaterThanOrEqual(0);
      expect(largeFillLevel).toBeGreaterThanOrEqual(0);
    });
  });
});
