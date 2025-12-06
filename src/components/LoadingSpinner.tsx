/**
 * Loading Spinner Component
 * Reusable loading indicator for async operations
 */

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ message = 'Loading...', fullScreen = false }: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner">
          <div className="spinner-icon">⏳</div>
          <div className="spinner-message">{message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="loading-inline">
      <div className="spinner-icon">⏳</div>
      <div className="spinner-message">{message}</div>
    </div>
  );
}
