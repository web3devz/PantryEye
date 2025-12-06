/**
 * Receipt Upload Component
 * Requirements: 3.1, 3.4, 12.2
 * Handles receipt image upload, OCR processing, and item review
 */

import { useState, useRef } from 'react';
import { inventoryService } from '../services/inventory/inventory';
import { ReceiptItem, InventoryUpdate } from '../types';
import { ReceiptReview } from './ReceiptReview.tsx';

interface ReceiptUploadProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function ReceiptUpload({ onComplete, onCancel }: ReceiptUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [receiptResult, setReceiptResult] = useState<{
    update: InventoryUpdate;
    items: ReceiptItem[];
  } | null>(null);
  const [showReview, setShowReview] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setProcessingError('Please select a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setProcessingError('Image file is too large. Please select a file under 10MB');
      return;
    }

    setSelectedFile(file);
    setProcessingError(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setReceiptResult(null);
    setProcessingError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processReceipt = async () => {
    if (!selectedFile || !canvasRef.current) return;

    try {
      setProcessing(true);
      setProcessingError(null);

      // Load image and convert to ImageData
      const imageData = await loadImageAsImageData(selectedFile);

      // Process with inventory service
      const update = await inventoryService.processReceipt(imageData);

      // Extract receipt items from audit log entries
      const items: ReceiptItem[] = [];
      for (const entry of update.auditLogEntries) {
        if (entry.data.receiptItem) {
          items.push(entry.data.receiptItem);
        }
      }

      // Check if no items were parsed (Requirement 12.2)
      if (items.length === 0) {
        setProcessingError(
          'Unable to extract readable text from the receipt.'
        );
        setProcessing(false);
        return;
      }

      setReceiptResult({ update, items });

      // Check if any items need review (low confidence < 0.6)
      // Requirement 3.4
      const needsReview = items.some(item => item.confidence < 0.6);
      if (needsReview) {
        setShowReview(true);
      }
    } catch (error) {
      console.error('Processing error:', error);
      
      // Check if error is due to unreadable text (Requirement 12.2)
      const errorMessage = error instanceof Error ? error.message : 'Failed to process receipt';
      if (errorMessage.toLowerCase().includes('unreadable') || 
          errorMessage.toLowerCase().includes('ocr') ||
          errorMessage.toLowerCase().includes('text extraction')) {
        setProcessingError(
          'Unable to extract readable text from the receipt.'
        );
      } else {
        setProcessingError(errorMessage);
      }
    } finally {
      setProcessing(false);
    }
  };

  const loadImageAsImageData = (file: File): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = canvasRef.current;

      if (!canvas) {
        reject(new Error('Canvas not available'));
        return;
      }

      img.onload = () => {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Unable to get canvas context'));
          return;
        }

        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image to canvas
        ctx.drawImage(img, 0, 0);

        // Get ImageData
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleComplete = () => {
    // Clean up preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onComplete();
  };

  const handleReviewConfirm = (confirmedItems: ReceiptItem[]) => {
    // Update receipt result with only confirmed items
    if (receiptResult) {
      setReceiptResult({
        ...receiptResult,
        items: confirmedItems,
      });
    }
    setShowReview(false);
  };

  const handleReviewCancel = () => {
    setShowReview(false);
  };

  const handleManualEntry = () => {
    // Close receipt upload and let user add items manually
    handleComplete();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content receipt-modal">
        <div className="modal-header">
          <h2>Receipt Upload</h2>
        </div>

        <div className="receipt-body">
          {processingError && (
            <div className="error-message">
              <strong>{processingError}</strong>
              <div className="error-suggestions">
                <p>Suggestions for better results:</p>
                <ul>
                  <li>Ensure the receipt is well-lit and in focus</li>
                  <li>Avoid shadows or glare on the receipt</li>
                  <li>Make sure all text is clearly visible</li>
                  <li>Try straightening the receipt if it's angled</li>
                </ul>
                <button
                  onClick={handleManualEntry}
                  className="secondary-button"
                  style={{ marginTop: '1rem' }}
                >
                  Enter Items Manually Instead
                </button>
              </div>
            </div>
          )}

          {/* File upload area */}
          <div className="receipt-upload-area">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {!previewUrl ? (
              <div className="upload-placeholder" onClick={handleUploadClick}>
                <div className="upload-icon">📄</div>
                <p className="upload-text">Click to upload receipt image</p>
                <p className="upload-hint">Supports JPG, PNG (max 10MB)</p>
              </div>
            ) : (
              <div className="receipt-preview">
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="receipt-image"
                />
              </div>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Processing state */}
          {processing && (
            <div className="processing-state">
              <div className="loading-spinner">Processing receipt...</div>
              <p className="processing-hint">Extracting text and parsing items...</p>
            </div>
          )}

          {/* Receipt review */}
          {showReview && receiptResult && !processing && (
            <ReceiptReview
              items={receiptResult.items}
              onConfirm={handleReviewConfirm}
              onCancel={handleReviewCancel}
            />
          )}

          {/* Receipt results */}
          {receiptResult && !processing && !showReview && (
            <div className="receipt-results">
              <h3>Processing Complete</h3>
              <p className="results-summary">
                Parsed {receiptResult.items.length} item(s) from receipt
              </p>
              <p className="results-summary">
                Updated {receiptResult.update.updatedItems.length} inventory item(s)
              </p>
            </div>
          )}

          {/* Action buttons */}
          {!showReview && (
            <div className="receipt-actions">
              {!selectedFile && (
                <>
                  <button
                    onClick={handleUploadClick}
                    className="primary-button"
                  >
                    Select Receipt Image
                  </button>
                  <button
                    onClick={onCancel}
                    className="secondary-button"
                  >
                    Cancel
                  </button>
                </>
              )}

              {selectedFile && !receiptResult && !processing && (
                <>
                  <button
                    onClick={processReceipt}
                    className="primary-button"
                  >
                    Process Receipt
                  </button>
                  <button
                    onClick={handleClearFile}
                    className="secondary-button"
                  >
                    Choose Different Image
                  </button>
                </>
              )}

              {receiptResult && !processing && (
                <>
                  <button
                    onClick={handleComplete}
                    className="primary-button"
                  >
                    Done
                  </button>
                  <button
                    onClick={handleClearFile}
                    className="secondary-button"
                  >
                    Upload Another
                  </button>
                </>
              )}

              {processingError && (
                <button
                  onClick={handleClearFile}
                  className="primary-button"
                >
                  Try Another Receipt
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
