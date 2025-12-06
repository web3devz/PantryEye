/**
 * Receipt Page Component
 * Standalone page wrapper for receipt upload
 */

import { ReceiptUpload } from './ReceiptUpload';

interface ReceiptPageProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function ReceiptPage({ onComplete, onCancel }: ReceiptPageProps) {
  return (
    <div className="page-container">
      <ReceiptUpload onComplete={onComplete} onCancel={onCancel} />
    </div>
  );
}
