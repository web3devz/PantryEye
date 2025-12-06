/**
 * Unit tests for OCR Service
 * Requirements: 3.1, 3.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OCRService } from './ocr';

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

describe('OCRService', () => {
  let ocrService: OCRService;

  beforeEach(() => {
    ocrService = new OCRService();
  });

  describe('initialize', () => {
    it('should initialize the OCR engine', async () => {
      expect(ocrService.isInitialized()).toBe(false);
      
      await ocrService.initialize();
      
      expect(ocrService.isInitialized()).toBe(true);
      expect(ocrService.isWorkerReady()).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      await ocrService.initialize();
      const firstInit = ocrService.isInitialized();
      
      await ocrService.initialize();
      
      expect(ocrService.isInitialized()).toBe(firstInit);
    });
  });

  describe('extractText', () => {
    it('should extract text from receipt image', async () => {
      // Create mock ImageData
      const mockImageData = new MockImageData(800, 600) as unknown as ImageData;
      
      const text = await ocrService.extractText(mockImageData);
      
      expect(text).toBeDefined();
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    });

    it('should auto-initialize if not initialized', async () => {
      expect(ocrService.isInitialized()).toBe(false);
      
      const mockImageData = new MockImageData(800, 600) as unknown as ImageData;
      await ocrService.extractText(mockImageData);
      
      expect(ocrService.isInitialized()).toBe(true);
    });

    it('should return text containing receipt elements', async () => {
      const mockImageData = new MockImageData(800, 600) as unknown as ImageData;
      
      const text = await ocrService.extractText(mockImageData);
      
      // Should contain typical receipt elements
      expect(text).toMatch(/\d+\.\d{2}/); // Price format
      expect(text.toLowerCase()).toMatch(/total|subtotal/); // Total line
    });
  });

  describe('parseReceipt', () => {
    it('should parse receipt text into structured data', async () => {
      const receiptText = `WALMART SUPERCENTER
Store #1234
12/6/2024

WHOLE MILK 1GAL    $3.99
LARGE EGGS DOZEN   $4.29
WHITE BREAD        $2.49

SUBTOTAL    $10.77
TAX         $0.86
TOTAL       $11.63

THANK YOU FOR SHOPPING`;

      const receipt = await ocrService.parseReceipt(receiptText);
      
      expect(receipt).toBeDefined();
      expect(receipt.items).toBeDefined();
      expect(receipt.items.length).toBeGreaterThan(0);
      expect(receipt.total).toBeGreaterThan(0);
      expect(receipt.date).toBeInstanceOf(Date);
      expect(receipt.confidence).toBeGreaterThan(0);
      expect(receipt.confidence).toBeLessThanOrEqual(1);
    });

    it('should extract vendor information', async () => {
      const receiptText = `WALMART SUPERCENTER
Store #1234
12/6/2024

MILK    $3.99

TOTAL   $3.99`;

      const receipt = await ocrService.parseReceipt(receiptText);
      
      expect(receipt.vendor).toBe('walmart');
    });

    it('should parse item names, quantities, and prices', async () => {
      const receiptText = `TARGET
12/6/2024

2x GREEK YOGURT    $2.58
ORANGE JUICE       $4.99

TOTAL    $7.57`;

      const receipt = await ocrService.parseReceipt(receiptText);
      
      expect(receipt.items.length).toBeGreaterThanOrEqual(2);
      
      const yogurt = receipt.items.find(item => item.name.toLowerCase().includes('yogurt'));
      expect(yogurt).toBeDefined();
      if (yogurt) {
        expect(yogurt.quantity).toBe(2);
        expect(yogurt.price).toBe(2.58);
        expect(yogurt.confidence).toBeGreaterThan(0);
      }
    });

    it('should parse date from receipt', async () => {
      const receiptText = `KROGER
12/6/2024

MILK    $3.99

TOTAL   $3.99`;

      const receipt = await ocrService.parseReceipt(receiptText);
      
      expect(receipt.date).toBeInstanceOf(Date);
      expect(receipt.date.getMonth()).toBe(11); // December (0-indexed)
      expect(receipt.date.getDate()).toBe(6);
      expect(receipt.date.getFullYear()).toBe(2024);
    });

    it('should calculate total from items if not found', async () => {
      const receiptText = `STORE
12/6/2024

ITEM A    $5.00
ITEM B    $3.50`;

      const receipt = await ocrService.parseReceipt(receiptText);
      
      expect(receipt.total).toBe(8.50);
    });

    it('should handle receipts with no items gracefully', async () => {
      const receiptText = `STORE
12/6/2024

THANK YOU`;

      const receipt = await ocrService.parseReceipt(receiptText);
      
      expect(receipt.items).toHaveLength(0);
      expect(receipt.confidence).toBeLessThan(0.5); // Low confidence
    });

    it('should assign confidence scores to items', async () => {
      const receiptText = `WALMART
12/6/2024

MILK    $3.99
EG      $4.29

TOTAL   $8.28`;

      const receipt = await ocrService.parseReceipt(receiptText);
      
      for (const item of receipt.items) {
        expect(item.confidence).toBeGreaterThan(0);
        expect(item.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should handle various date formats', async () => {
      const receiptText1 = `STORE\n12/6/2024\nMILK $3.99\nTOTAL $3.99`;
      const receiptText2 = `STORE\n12-6-24\nMILK $3.99\nTOTAL $3.99`;
      
      const receipt1 = await ocrService.parseReceipt(receiptText1);
      const receipt2 = await ocrService.parseReceipt(receiptText2);
      
      expect(receipt1.date).toBeInstanceOf(Date);
      expect(receipt2.date).toBeInstanceOf(Date);
      expect(receipt2.date.getFullYear()).toBe(2024); // Should handle 2-digit year
    });

    it('should skip header and footer lines', async () => {
      const receiptText = `WALMART SUPERCENTER
Store Address Line 1
Store Address Line 2
Receipt #12345
12/6/2024

MILK    $3.99

TOTAL   $3.99

Thank you for shopping
Visit us online`;

      const receipt = await ocrService.parseReceipt(receiptText);
      
      // Should only have actual items, not header/footer text
      expect(receipt.items.length).toBe(1);
      expect(receipt.items[0].name.toLowerCase()).toContain('milk');
    });
  });

  describe('integration', () => {
    it('should extract and parse receipt in one flow', async () => {
      const mockImageData = new MockImageData(800, 600) as unknown as ImageData;
      
      // Extract text
      const text = await ocrService.extractText(mockImageData);
      expect(text).toBeDefined();
      
      // Parse text
      const receipt = await ocrService.parseReceipt(text);
      expect(receipt).toBeDefined();
      expect(receipt.items.length).toBeGreaterThan(0);
      expect(receipt.total).toBeGreaterThan(0);
    });
  });
});
