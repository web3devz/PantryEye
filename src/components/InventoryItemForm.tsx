/**
 * Inventory Item Form Component
 * Requirements: 10.2
 * Form for adding new items or editing existing items
 */

import { useState } from 'react';
import { InventoryItem, SKU } from '../types';
import { inventoryService } from '../services/inventory/inventory';

interface InventoryItemFormProps {
  item?: InventoryItem; // If provided, edit mode; otherwise, add mode
  onSave: () => void;
  onCancel: () => void;
}

export function InventoryItemForm({ item, onSave, onCancel }: InventoryItemFormProps) {
  const isEditMode = !!item;

  // Form state
  const [skuId, setSkuId] = useState(item?.sku.id || '');
  const [name, setName] = useState(item?.sku.name || '');
  const [category, setCategory] = useState(item?.sku.category || 'pantry');
  const [unit, setUnit] = useState(item?.sku.unit || 'count');
  const [quantity, setQuantity] = useState(item?.quantity.toString() || '1');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!skuId.trim()) {
      setError('SKU ID is required');
      return;
    }
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum < 0) {
      setError('Quantity must be a non-negative number');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isEditMode) {
        // Edit existing item - only update quantity
        await inventoryService.updateItem(item.sku.id, quantityNum);
      } else {
        // Add new item
        const sku: SKU = {
          id: skuId.trim(),
          name: name.trim(),
          category: category.trim(),
          unit: unit.trim(),
          marketplaceIds: new Map(),
        };
        await inventoryService.addItem(sku, quantityNum);
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{isEditMode ? 'Edit Item' : 'Add New Item'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="inventory-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="skuId">SKU ID</label>
            <input
              type="text"
              id="skuId"
              value={skuId}
              onChange={(e) => setSkuId(e.target.value)}
              disabled={isEditMode || loading}
              placeholder="e.g., MILK-001"
              required
            />
            {isEditMode && (
              <small>SKU cannot be changed when editing</small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="name">Item Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isEditMode || loading}
              placeholder="e.g., Whole Milk"
              required
            />
            {isEditMode && (
              <small>Name cannot be changed when editing</small>
            )}
          </div>

          {!isEditMode && (
            <>
              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={loading}
                >
                  <option value="pantry">Pantry</option>
                  <option value="refrigerator">Refrigerator</option>
                  <option value="freezer">Freezer</option>
                  <option value="produce">Produce</option>
                  <option value="dairy">Dairy</option>
                  <option value="meat">Meat</option>
                  <option value="beverages">Beverages</option>
                  <option value="snacks">Snacks</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="unit">Unit</label>
                <select
                  id="unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  disabled={loading}
                >
                  <option value="count">Count</option>
                  <option value="oz">Ounces (oz)</option>
                  <option value="lb">Pounds (lb)</option>
                  <option value="g">Grams (g)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="ml">Milliliters (ml)</option>
                  <option value="l">Liters (l)</option>
                  <option value="gal">Gallons (gal)</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="quantity">Quantity</label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={loading}
              min="0"
              step="0.1"
              required
            />
            <small>Current quantity in {item?.sku.unit || unit}</small>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onCancel}
              className="secondary-button"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading ? 'Saving...' : isEditMode ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
