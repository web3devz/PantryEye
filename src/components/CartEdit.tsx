/**
 * Cart Edit Component
 * Requirements: 7.4
 * Allows modification of brand, quantity, and removal of items
 * Updates total price dynamically
 */

import { useState, useEffect } from 'react';
import { DraftCart, CartItem } from '../types';

interface CartEditProps {
  cart: DraftCart;
  onSave: (updatedCart: DraftCart) => void;
  onCancel: () => void;
}

interface EditableCartItem extends CartItem {
  removed: boolean;
}

export function CartEdit({ cart, onSave, onCancel }: CartEditProps) {
  const [editableItems, setEditableItems] = useState<EditableCartItem[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);

  // Initialize editable items from cart
  useEffect(() => {
    const items = cart.items.map(item => ({
      ...item,
      removed: false,
    }));
    setEditableItems(items);
  }, [cart]);

  // Recalculate total price whenever items change
  useEffect(() => {
    const total = editableItems
      .filter(item => !item.removed)
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setTotalPrice(total);
  }, [editableItems]);

  const handleQuantityChange = (index: number, newQuantity: string) => {
    const quantity = parseInt(newQuantity, 10);
    if (isNaN(quantity) || quantity < 1) return;

    setEditableItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity };
      return updated;
    });
  };

  const handleBrandChange = (index: number, newBrand: string) => {
    setEditableItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], brand: newBrand };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setEditableItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], removed: true };
      return updated;
    });
  };

  const handleUndoRemove = (index: number) => {
    setEditableItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], removed: false };
      return updated;
    });
  };

  const handleSave = () => {
    // Filter out removed items
    const finalItems = editableItems
      .filter(item => !item.removed)
      .map(({ removed, ...item }) => item);

    // Create updated cart
    const updatedCart: DraftCart = {
      ...cart,
      items: finalItems,
      totalPrice,
    };

    onSave(updatedCart);
  };

  const activeItemCount = editableItems.filter(item => !item.removed).length;

  return (
    <div className="cart-edit">
      <h3>Edit Shopping Cart</h3>
      
      <div className="edit-instructions">
        Modify quantities, change brands, or remove items. Changes will update the total price automatically.
      </div>

      <div className="editable-cart-items">
        {editableItems.map((item, index) => {
          const itemTotal = item.price * item.quantity;

          return (
            <div
              key={`${item.sku.id}-${index}`}
              className={`editable-cart-item ${item.removed ? 'removed' : ''}`}
            >
              <div className="edit-item-header">
                <div className="edit-item-name">{item.sku.name}</div>
                {!item.removed ? (
                  <button
                    onClick={() => handleRemoveItem(index)}
                    className="remove-item-button"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => handleUndoRemove(index)}
                    className="undo-remove-button"
                  >
                    Undo
                  </button>
                )}
              </div>

              {!item.removed && (
                <>
                  <div className="edit-item-fields">
                    <div className="edit-field">
                      <label htmlFor={`brand-${index}`}>Brand</label>
                      <input
                        id={`brand-${index}`}
                        type="text"
                        value={item.brand}
                        onChange={(e) => handleBrandChange(index, e.target.value)}
                      />
                    </div>

                    <div className="edit-field">
                      <label htmlFor={`quantity-${index}`}>Quantity</label>
                      <input
                        id={`quantity-${index}`}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                      />
                    </div>

                    <div className="edit-field">
                      <label>Price per unit</label>
                      <input
                        type="text"
                        value={`$${item.price.toFixed(2)}`}
                        disabled
                      />
                    </div>
                  </div>

                  <div className="edit-item-total">
                    <span className="edit-item-total-label">Item Total:</span>
                    <span className="edit-item-total-value">${itemTotal.toFixed(2)}</span>
                  </div>
                </>
              )}

              {item.removed && (
                <div className="removed-notice">
                  This item will be removed from the cart.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="edit-cart-summary">
        <div className="edit-summary-row">
          <span className="edit-summary-label">Active Items:</span>
          <span className="edit-summary-value">{activeItemCount}</span>
        </div>
        <div className="edit-summary-row edit-total-row">
          <span className="edit-summary-label">Total Price:</span>
          <span className="edit-summary-value edit-total-price">
            ${totalPrice.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="edit-actions">
        <button
          onClick={handleSave}
          disabled={activeItemCount === 0}
          className="primary-button"
        >
          Save Changes
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
