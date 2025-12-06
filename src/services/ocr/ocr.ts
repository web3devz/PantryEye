/**
 * OCR Service for PantryEye
 * Extracts text from receipt images using on-device Tesseract OCR
 * Requirements: 3.1, 3.2
 * 
 * NOTE: This is currently a mock implementation with the real interface.
 * TODO: Integrate actual Tesseract.js for OCR
 * TODO: Load Tesseract worker and language data
 * TODO: Implement receipt-specific preprocessing (deskew, contrast enhancement)
 */

import { ReceiptData, ReceiptItem } from '../../types';

/**
 * OCRService class
 * Handles on-device OCR for receipt text extraction
 */
export class OCRService {
  private initialized = false;
  private workerReady = false;

  /**
   * Initialize the OCR engine
   * Requirement 3.1
   * 
   * TODO: Replace with actual Tesseract.js initialization
   * - Create Tesseract worker
   * - Load language data (eng.traineddata)
   * - Configure for receipt-optimized OCR
   * - Set PSM mode for sparse text
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Mock initialization - simulate Tesseract loading delay
    await new Promise((resolve) => setTimeout(resolve, 150));

    // TODO: Actual implementation would be:
    // const worker = await createWorker('eng');
    // await worker.setParameters({
    //   tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    // });
    // this.worker = worker;

    this.workerReady = true;
    this.initialized = true;
  }

  /**
   * Extract text from receipt image
   * Requirement 3.1
   * 
   * @param imageData - Image data from receipt upload
   * @returns Extracted text string
   * 
   * TODO: Replace with actual Tesseract OCR
   * - Preprocess image (grayscale, threshold, deskew)
   * - Run Tesseract recognition
   * - Post-process text (remove noise, fix common OCR errors)
   * - Return raw text with confidence scores
   */
  async extractText(_imageData: ImageData): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Mock implementation - return realistic receipt text
    // TODO: Replace with actual Tesseract OCR pipeline
    // TODO: Use imageData for actual OCR processing
    const mockText = this.generateMockReceiptText();

    return mockText;
  }

  /**
   * Parse extracted text into structured receipt
   * Requirement 3.2
   * 
   * @param text - Raw text extracted from receipt
   * @returns Structured receipt data with items, prices, and metadata
   * 
   * This implements basic parsing logic that will work with real OCR output
   */
  async parseReceipt(text: string): Promise<ReceiptData> {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const items: ReceiptItem[] = [];
    let total = 0;
    let date: Date = new Date();
    let vendor: string | undefined;
    let overallConfidence = 0.8; // Default confidence for mock

    // Parse vendor (usually in first few lines)
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('walmart') || line.includes('wal-mart')) {
        vendor = 'walmart';
        break;
      } else if (line.includes('amazon') || line.includes('whole foods')) {
        vendor = 'amazon';
        break;
      } else if (line.includes('target') || line.includes('kroger') || line.includes('safeway')) {
        vendor = line.split(/\s+/)[0];
        break;
      }
    }

    // Parse date (look for date patterns)
    for (const line of lines) {
      const dateMatch = line.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (dateMatch) {
        const [, month, day, year] = dateMatch;
        const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
        date = new Date(fullYear, parseInt(month) - 1, parseInt(day));
        break;
      }
    }

    // Parse items and prices
    // Look for lines with item names followed by prices
    // Common patterns: "ITEM NAME    $X.XX" or "ITEM NAME X.XX"
    for (const line of lines) {
      // Skip header/footer lines
      if (line.toLowerCase().includes('receipt') || 
          line.toLowerCase().includes('thank you') ||
          line.toLowerCase().includes('store') ||
          line.toLowerCase().includes('address')) {
        continue;
      }

      // Look for price pattern at end of line
      const priceMatch = line.match(/\$?\s*(\d+\.\d{2})\s*$/);
      if (priceMatch) {
        const price = parseFloat(priceMatch[1]);
        
        // Check if this is the total line
        if (line.toLowerCase().includes('total') || 
            line.toLowerCase().includes('subtotal') ||
            line.toLowerCase().includes('amount due')) {
          total = price;
          continue;
        }

        // Extract item name (everything before the price)
        let itemName = line.substring(0, line.lastIndexOf(priceMatch[0])).trim();
        
        // Remove quantity indicators if present (e.g., "2x" or "@ 2")
        let quantity = 1;
        const qtyMatch = itemName.match(/^(\d+)\s*x\s+/i) || itemName.match(/\s+@\s*(\d+)\s*$/i);
        if (qtyMatch) {
          quantity = parseInt(qtyMatch[1]);
          itemName = itemName.replace(qtyMatch[0], '').trim();
        }

        // Skip if item name is too short (likely parsing error)
        if (itemName.length < 3) {
          continue;
        }

        // Calculate confidence based on item name quality
        // Higher confidence for longer, more readable names
        const itemConfidence = Math.min(0.95, 0.6 + (itemName.length / 50));

        items.push({
          name: itemName,
          quantity,
          price,
          confidence: parseFloat(itemConfidence.toFixed(2)),
        });
      }
    }

    // If no total was found, sum up item prices
    if (total === 0 && items.length > 0) {
      total = items.reduce((sum, item) => sum + item.price, 0);
    }

    // Calculate overall confidence based on parsing success
    if (items.length === 0) {
      overallConfidence = 0.3; // Low confidence if no items found
    } else if (items.length < 3) {
      overallConfidence = 0.6; // Medium confidence for few items
    } else if (vendor && total > 0) {
      overallConfidence = 0.85; // High confidence if we got vendor and total
    }

    return {
      items,
      total: parseFloat(total.toFixed(2)),
      date,
      vendor,
      confidence: parseFloat(overallConfidence.toFixed(2)),
    };
  }

  /**
   * Generate mock receipt text for testing
   * This simulates what Tesseract would extract from a receipt image
   * 
   * @private
   */
  private generateMockReceiptText(): string {
    const vendors = ['WALMART', 'TARGET', 'KROGER', 'SAFEWAY'];
    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;

    // Common grocery items with realistic prices
    const groceryItems = [
      { name: 'WHOLE MILK 1GAL', price: 3.99, qty: 1 },
      { name: 'LARGE EGGS DOZEN', price: 4.29, qty: 1 },
      { name: 'WHITE BREAD', price: 2.49, qty: 1 },
      { name: 'BUTTER UNSALTED', price: 5.99, qty: 1 },
      { name: 'CHEDDAR CHEESE 8OZ', price: 4.79, qty: 1 },
      { name: 'GREEK YOGURT', price: 1.29, qty: 2 },
      { name: 'ORANGE JUICE 64OZ', price: 4.99, qty: 1 },
      { name: 'BANANAS LB', price: 0.59, qty: 3 },
      { name: 'TOMATOES LB', price: 1.99, qty: 2 },
      { name: 'CHICKEN BREAST LB', price: 5.99, qty: 2 },
    ];

    // Select 4-7 random items
    const numItems = Math.floor(Math.random() * 4) + 4;
    const selectedItems = [];
    const usedIndices = new Set<number>();

    while (selectedItems.length < numItems && usedIndices.size < groceryItems.length) {
      const idx = Math.floor(Math.random() * groceryItems.length);
      if (!usedIndices.has(idx)) {
        usedIndices.add(idx);
        selectedItems.push(groceryItems[idx]);
      }
    }

    // Build receipt text
    let receiptText = `${vendor} SUPERCENTER\n`;
    receiptText += `Store #1234\n`;
    receiptText += `${dateStr}\n`;
    receiptText += `\n`;

    let total = 0;
    for (const item of selectedItems) {
      const itemTotal = item.price * item.qty;
      total += itemTotal;
      
      if (item.qty > 1) {
        receiptText += `${item.qty}x ${item.name}    $${itemTotal.toFixed(2)}\n`;
      } else {
        receiptText += `${item.name}    $${itemTotal.toFixed(2)}\n`;
      }
    }

    receiptText += `\n`;
    receiptText += `SUBTOTAL    $${total.toFixed(2)}\n`;
    receiptText += `TAX         $${(total * 0.08).toFixed(2)}\n`;
    receiptText += `TOTAL       $${(total * 1.08).toFixed(2)}\n`;
    receiptText += `\n`;
    receiptText += `THANK YOU FOR SHOPPING\n`;

    return receiptText;
  }

  /**
   * Check if OCR engine is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if worker is ready
   */
  isWorkerReady(): boolean {
    return this.workerReady;
  }
}

// Singleton instance
export const ocrService = new OCRService();
