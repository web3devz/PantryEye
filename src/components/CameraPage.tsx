/**
 * Camera Page Component
 * Standalone page wrapper for camera capture with upload option
 */

import { useState } from 'react';
import { CameraCapture } from './CameraCapture';

interface CameraPageProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function CameraPage({ onComplete, onCancel }: CameraPageProps) {
  const [mode, setMode] = useState<'select' | 'camera' | 'upload'>('select');

  if (mode === 'camera') {
    return <CameraCapture onComplete={onComplete} onCancel={() => setMode('select')} />;
  }

  if (mode === 'upload') {
    return <CameraCapture onComplete={onComplete} onCancel={() => setMode('select')} uploadMode />;
  }

  return (
    <div className="camera-mode-selector">
      <div className="mode-selector-content">
        <h2>Capture Items</h2>
        <p className="mode-description">Choose how you want to capture your items</p>
        
        <div className="mode-options">
          <button 
            className="mode-option-card"
            onClick={() => setMode('camera')}
          >
            <div className="mode-icon">📷</div>
            <h3>Take Photo</h3>
            <p>Use your camera to capture items in real-time</p>
          </button>

          <button 
            className="mode-option-card"
            onClick={() => setMode('upload')}
          >
            <div className="mode-icon">🖼️</div>
            <h3>Upload Image</h3>
            <p>Select an existing photo from your device</p>
          </button>
        </div>

        <button onClick={onCancel} className="cancel-mode-button">
          Cancel
        </button>
      </div>
    </div>
  );
}
