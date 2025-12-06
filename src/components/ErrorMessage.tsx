/**
 * Error Message Component
 * Requirements: 12.1, 12.2, 12.3
 * Displays error messages with optional retry functionality
 */

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  suggestions?: string[];
  type?: 'error' | 'warning' | 'info';
}

export function ErrorMessage({ 
  message, 
  onRetry, 
  suggestions,
  type = 'error' 
}: ErrorMessageProps) {
  const getClassName = () => {
    switch (type) {
      case 'warning':
        return 'error-message warning-message';
      case 'info':
        return 'error-message info-message';
      default:
        return 'error-message';
    }
  };

  return (
    <div className={getClassName()}>
      <div className="error-content">
        <div className="error-text">{message}</div>
        
        {suggestions && suggestions.length > 0 && (
          <div className="error-suggestions">
            <p>Suggestions:</p>
            <ul>
              {suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {onRetry && (
        <button onClick={onRetry} className="retry-button primary-button">
          Retry
        </button>
      )}
    </div>
  );
}
