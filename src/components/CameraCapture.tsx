/**
 * Camera Capture Component
 * Requirements: 2.1, 2.5, 12.1
 * Handles camera access, image capture, and CV processing
 */

import { useState, useRef, useEffect } from 'react';
import { inventoryService } from '../services/inventory/inventory';
import { Detection, InventoryUpdate } from '../types';
import { DetectionReview } from './DetectionReview';

interface CameraCaptureProps {
  onComplete: () => void;
  onCancel: () => void;
  uploadMode?: boolean;
}

export function CameraCapture({ onComplete, onCancel, uploadMode = false }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<{
    update: InventoryUpdate;
    detections: Detection[];
  } | null>(null);
  const [showReview, setShowReview] = useState(false);

  // Initialize camera on mount (only if not in upload mode)
  useEffect(() => {
    if (!uploadMode) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [uploadMode]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setCameraError(
        'Unable to access camera. Please ensure camera permissions are granted.'
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageDataUrl);

    // Stop camera after capture
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setDetectionResult(null);
    setProcessingError(null);
    if (!uploadMode) {
      startCamera();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setCameraError('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageDataUrl = e.target?.result as string;
      
      // Load image to canvas
      const img = new Image();
      img.onload = () => {
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          if (context) {
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0);
            setCapturedImage(imageDataUrl);
          }
        }
      };
      img.src = imageDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const processImage = async () => {
    if (!canvasRef.current || !capturedImage) return;

    try {
      setProcessing(true);
      setProcessingError(null);

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Unable to get canvas context');
      }

      // Get ImageData from canvas
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Process with inventory service
      const update = await inventoryService.processCameraCapture(imageData);

      // Extract detections from audit log entries
      const detections: Detection[] = [];
      for (const entry of update.auditLogEntries) {
        if (entry.data.detection) {
          detections.push(entry.data.detection);
        }
      }

      // Check if no items were detected (Requirement 12.1)
      if (detections.length === 0) {
        setProcessingError(
          'No items were detected in the image.'
        );
        setProcessing(false);
        return;
      }

      setDetectionResult({ update, detections });
      
      // Check if any detections need review (Requirement 2.5)
      const needsReview = detections.some(d => d.confidence < 0.7);
      if (needsReview) {
        setShowReview(true);
      }
    } catch (error) {
      console.error('Processing error:', error);
      setProcessingError(
        error instanceof Error ? error.message : 'Failed to process image'
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleComplete = () => {
    stopCamera();
    onComplete();
  };

  const handleReviewConfirm = (confirmedDetections: Detection[]) => {
    // Update detection result with only confirmed detections
    if (detectionResult) {
      setDetectionResult({
        ...detectionResult,
        detections: confirmedDetections,
      });
    }
    setShowReview(false);
  };

  const handleReviewCancel = () => {
    setShowReview(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content camera-modal">
        <div className="modal-header">
          <h2>Camera Capture</h2>
        </div>

        <div className="camera-body">
          {cameraError && (
            <div className="error-message">
              {cameraError}
            </div>
          )}

          {processingError && (
            <div className="error-message">
              <strong>{processingError}</strong>
              <div className="error-suggestions">
                <p>Suggestions for better results:</p>
                <ul>
                  <li>Ensure good lighting on the items</li>
                  <li>Position items clearly in the frame</li>
                  <li>Avoid blurry or out-of-focus images</li>
                  <li>Try capturing from a different angle</li>
                </ul>
              </div>
            </div>
          )}

          {/* Camera preview or captured image */}
          <div className="camera-preview">
            {!capturedImage ? (
              uploadMode ? (
                <div className="upload-placeholder" onClick={triggerFileInput}>
                  <div className="upload-icon">📁</div>
                  <p className="upload-text">Click to select an image</p>
                  <p className="upload-hint">Supports JPG, PNG, and other image formats</p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="camera-video"
                />
              )
            ) : (
              <img
                src={capturedImage}
                alt="Captured"
                className="captured-image"
              />
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          {/* Processing state */}
          {processing && (
            <div className="processing-state">
              <div className="loading-spinner">Processing image...</div>
            </div>
          )}

          {/* Detection review */}
          {showReview && detectionResult && !processing && (
            <DetectionReview
              detections={detectionResult.detections}
              onConfirm={handleReviewConfirm}
              onCancel={handleReviewCancel}
            />
          )}

          {/* Detection results */}
          {detectionResult && !processing && !showReview && (
            <div className="detection-results">
              <h3>Detection Results</h3>
              <p className="results-summary">
                Detected {detectionResult.detections.length} item(s)
              </p>
              <p className="results-summary">
                Updated {detectionResult.update.updatedItems.length} inventory item(s)
              </p>
            </div>
          )}

          {/* Action buttons */}
          {!showReview && (
            <div className="camera-actions">
              {!capturedImage && cameraActive && !uploadMode && (
                <>
                  <button
                    onClick={captureImage}
                    className="primary-button"
                  >
                    Capture Photo
                  </button>
                  <button
                    onClick={onCancel}
                    className="secondary-button"
                  >
                    Cancel
                  </button>
                </>
              )}

              {!capturedImage && uploadMode && (
                <>
                  <button
                    onClick={triggerFileInput}
                    className="primary-button"
                  >
                    Select Image
                  </button>
                  <button
                    onClick={onCancel}
                    className="secondary-button"
                  >
                    Cancel
                  </button>
                </>
              )}

              {capturedImage && !detectionResult && !processing && (
                <>
                  <button
                    onClick={processImage}
                    className="primary-button"
                  >
                    Process Image
                  </button>
                  <button
                    onClick={retakePhoto}
                    className="secondary-button"
                  >
                    Retake Photo
                  </button>
                </>
              )}

              {detectionResult && !processing && (
                <>
                  <button
                    onClick={handleComplete}
                    className="primary-button"
                  >
                    Done
                  </button>
                  <button
                    onClick={retakePhoto}
                    className="secondary-button"
                  >
                    Capture Another
                  </button>
                </>
              )}

              {processingError && (
                <button
                  onClick={retakePhoto}
                  className="primary-button"
                >
                  Retake Photo
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
