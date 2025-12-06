/**
 * Detection Review Component
 * Requirements: 2.5
 * Displays detected items with confidence scores and allows manual confirmation
 */

import { useState } from 'react';
import { Detection } from '../types';

interface DetectionReviewProps {
  detections: Detection[];
  onConfirm: (confirmedDetections: Detection[]) => void;
  onCancel: () => void;
}

export function DetectionReview({
  detections,
  onConfirm,
  onCancel,
}: DetectionReviewProps) {
  // Track which low-confidence detections are confirmed/rejected
  const [detectionStates, setDetectionStates] = useState<Map<number, 'confirmed' | 'rejected'>>(
    new Map()
  );

  const getConfidenceLevel = (confidence: number): 'high' | 'medium' | 'low' => {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.7) return 'medium';
    return 'low';
  };

  const handleConfirmDetection = (index: number) => {
    setDetectionStates(prev => {
      const newMap = new Map(prev);
      newMap.set(index, 'confirmed');
      return newMap;
    });
  };

  const handleRejectDetection = (index: number) => {
    setDetectionStates(prev => {
      const newMap = new Map(prev);
      newMap.set(index, 'rejected');
      return newMap;
    });
  };

  const handleConfirmAll = () => {
    // Filter out rejected detections
    const confirmedDetections = detections.filter((_, index) => {
      const state = detectionStates.get(index);
      return state !== 'rejected';
    });

    onConfirm(confirmedDetections);
  };

  // Check if all low-confidence detections have been reviewed
  const lowConfidenceDetections = detections.filter(d => d.confidence < 0.7);
  const unreviewedLowConfidence = lowConfidenceDetections.filter((_, index) => {
    const originalIndex = detections.findIndex(d => d === lowConfidenceDetections[index]);
    return !detectionStates.has(originalIndex);
  });

  const canProceed = unreviewedLowConfidence.length === 0;

  return (
    <div className="detection-review">
      <h3>Review Detected Items</h3>
      
      {lowConfidenceDetections.length > 0 && (
        <div className="review-notice">
          <p>
            Some detections have low confidence (below 70%). Please review and confirm or reject them.
          </p>
        </div>
      )}

      <div className="detection-list">
        {detections.map((detection, index) => {
          const confidenceLevel = getConfidenceLevel(detection.confidence);
          const needsReview = detection.confidence < 0.7;
          const state = detectionStates.get(index);

          return (
            <div
              key={index}
              className={`detection-item ${needsReview ? 'low-confidence' : ''} ${
                state === 'rejected' ? 'rejected' : ''
              }`}
            >
              <div className="detection-header">
                <span className="detection-name">{detection.class}</span>
                <span className={`confidence-badge ${confidenceLevel}`}>
                  {Math.round(detection.confidence * 100)}% confidence
                </span>
              </div>

              <div className="detection-details">
                <div className="detection-detail">
                  <span className="detection-detail-label">Fill Level</span>
                  <span className="detection-detail-value">
                    {Math.round(detection.fillLevel)}%
                  </span>
                </div>
                <div className="detection-detail">
                  <span className="detection-detail-label">Position</span>
                  <span className="detection-detail-value">
                    ({Math.round(detection.boundingBox.x)}, {Math.round(detection.boundingBox.y)})
                  </span>
                </div>
                <div className="detection-detail">
                  <span className="detection-detail-label">Size</span>
                  <span className="detection-detail-value">
                    {Math.round(detection.boundingBox.width)} × {Math.round(detection.boundingBox.height)}
                  </span>
                </div>
              </div>

              {needsReview && !state && (
                <div className="confirmation-needed">
                  <p>This detection needs manual confirmation due to low confidence.</p>
                  <div className="confirmation-actions">
                    <button
                      onClick={() => handleConfirmDetection(index)}
                      className="confirm-button"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => handleRejectDetection(index)}
                      className="reject-button"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {state === 'confirmed' && (
                <div className="confirmation-status confirmed">
                  ✓ Confirmed
                </div>
              )}

              {state === 'rejected' && (
                <div className="confirmation-status rejected">
                  ✗ Rejected
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="review-actions">
        <button
          onClick={handleConfirmAll}
          className="primary-button"
          disabled={!canProceed}
        >
          {canProceed ? 'Confirm All' : `Review ${unreviewedLowConfidence.length} more item(s)`}
        </button>
        <button
          onClick={onCancel}
          className="secondary-button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
