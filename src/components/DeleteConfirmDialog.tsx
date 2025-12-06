/**
 * Delete Confirmation Dialog Component
 * Requirements: 10.4
 * Shows confirmation dialog before deleting an item
 */

import { InventoryItem } from '../types';

interface DeleteConfirmDialogProps {
  item: InventoryItem;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({ item, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content delete-dialog">
        <div className="modal-header">
          <h2>Delete Item</h2>
        </div>

        <div className="delete-dialog-body">
          <p>Are you sure you want to delete this item?</p>
          
          <div className="item-details">
            <div className="detail-row">
              <span className="detail-label">SKU:</span>
              <span className="detail-value">{item.sku.id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Name:</span>
              <span className="detail-value">{item.sku.name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Quantity:</span>
              <span className="detail-value">{item.quantity} {item.sku.unit}</span>
            </div>
          </div>

          <p className="warning-text">
            This will remove the item from your active inventory. Historical records will be preserved in the audit log.
          </p>
        </div>

        <div className="form-actions delete-actions">
          <button
            onClick={onCancel}
            className="secondary-button"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="danger-button"
          >
            Delete Item
          </button>
        </div>
      </div>
    </div>
  );
}
