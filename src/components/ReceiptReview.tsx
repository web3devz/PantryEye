/**
 * Receipt Review Component
 * Requirements: 3.4
 * Displays parsed receipt items with confidence scores and allows editing
 */

import { useState } from 'react';
import { ReceiptItem } from '../types';

interface ReceiptReviewProps {
  items: ReceiptItem[];
  onConfirm: (confirmedItems: ReceiptItem[]) => void;
  onCancel: () => void;
}

export function ReceiptReview({ items, onConfirm, onCancel }: ReceiptReviewProps) {
  const [editableItems, setEditableItems] = useState<ReceiptItem[]>(
    items.map(item => ({ ...item }))
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
  };

  const handleSaveEdit = (index: number, updatedItem: ReceiptItem) => {
    const newItems = [...editableItems];
    newItems[index] = updatedItem;
    setEditableItems(newItems);
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
  };

  const handleRemove = (index: number) => {
    const newItems = editableItems.filter((_, i) => i !== index);
    setEditableItems(newItems);
  };

  const handleConfirm = () => {
    onConfirm(editableItems);
  };

  const getConfidenceClass = (confidence: number): string => {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className="receipt-review">
      <h3>Review Parsed Items</h3>
      <p className="review-description">
        Please review the items extracted from the receipt. 
        Items with low confidence may need correction.
      </p>

      <div className="receipt-items-list">
        {editableItems.map((item, index) => (
          <div key={index} className="receipt-item-card">
            {editingIndex === index ? (
              <ReceiptItemEditor
                item={item}
                onSave={(updatedItem) => handleSaveEdit(index, updatedItem)}
                onCancel={handleCancelEdit}
              />
            ) : (
              <>
                <div className="receipt-item-header">
                  <span className={`confidence-badge ${getConfidenceClass(item.confidence)}`}>
                    {getConfidenceLabel(item.confidence)} confidence ({Math.round(item.confidence * 100)}%)
                  </span>
                </div>
                <div className="receipt-item-details">
                  <div className="item-field">
                    <label>Item Name:</label>
                    <span className="item-value">{item.name}</span>
                  </div>
                  <div className="item-field">
                    <label>Quantity:</label>
                    <span className="item-value">{item.quantity}</span>
                  </div>
                  <div className="item-field">
                    <label>Price:</label>
                    <span className="item-value">${item.price.toFixed(2)}</span>
                  </div>
                </div>
                <div className="receipt-item-actions">
                  <button
                    onClick={() => handleEdit(index)}
                    className="action-button edit-button"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemove(index)}
                    className="action-button delete-button"
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {editableItems.length === 0 && (
        <div className="empty-items-message">
          All items have been removed. Click Cancel to go back.
        </div>
      )}

      <div className="review-actions">
        <button
          onClick={handleConfirm}
          className="primary-button"
          disabled={editableItems.length === 0}
        >
          Confirm Items
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

interface ReceiptItemEditorProps {
  item: ReceiptItem;
  onSave: (item: ReceiptItem) => void;
  onCancel: () => void;
}

function ReceiptItemEditor({ item, onSave, onCancel }: ReceiptItemEditorProps) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity.toString());
  const [price, setPrice] = useState(item.price.toFixed(2));
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    // Validate inputs
    const quantityNum = parseInt(quantity);
    const priceNum = parseFloat(price);

    if (!name.trim()) {
      setError('Item name is required');
      return;
    }

    if (isNaN(quantityNum) || quantityNum <= 0) {
      setError('Quantity must be a positive number');
      return;
    }

    if (isNaN(priceNum) || priceNum < 0) {
      setError('Price must be a valid number');
      return;
    }

    // Save updated item
    onSave({
      name: name.trim(),
      quantity: quantityNum,
      price: priceNum,
      confidence: item.confidence, // Keep original confidence
    });
  };

  return (
    <div className="receipt-item-editor">
      <div className="editor-field">
        <label htmlFor="item-name">Item Name:</label>
        <input
          id="item-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="editor-input"
        />
      </div>
      <div className="editor-field">
        <label htmlFor="item-quantity">Quantity:</label>
        <input
          id="item-quantity"
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="editor-input"
        />
      </div>
      <div className="editor-field">
        <label htmlFor="item-price">Price:</label>
        <input
          id="item-price"
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="editor-input"
        />
      </div>

      {error && (
        <div className="editor-error">{error}</div>
      )}

      <div className="editor-actions">
        <button
          onClick={handleSave}
          className="primary-button"
        >
          Save
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
