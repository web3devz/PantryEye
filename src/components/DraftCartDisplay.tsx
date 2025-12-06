/**
 * Draft Cart Display Component
 * Requirements: 7.1, 7.2
 * Shows all cart items with explanations, selected brands, and total price
 */

import { DraftCart } from '../types';

interface DraftCartDisplayProps {
  cart: DraftCart;
}

export function DraftCartDisplay({ cart }: DraftCartDisplayProps) {
  if (!cart || cart.items.length === 0) {
    return (
      <div className="empty-cart">
        <p>No items in cart. Items will appear here when they need restocking.</p>
      </div>
    );
  }

  return (
    <div className="draft-cart-display">
      <div className="cart-header">
        <h3>Draft Shopping Cart</h3>
        <div className="cart-vendor">
          <span className="vendor-label">Vendor:</span>
          <span className="vendor-value">{cart.vendor}</span>
        </div>
      </div>

      <div className="cart-items-list">
        {cart.items.map((item, index) => {
          const explanation = cart.explanations.get(item.sku.id) || '';
          const itemTotal = item.price * item.quantity;

          return (
            <div key={`${item.sku.id}-${index}`} className="cart-item-card">
              <div className="cart-item-header">
                <div className="item-name">{item.sku.name}</div>
                {item.isSubstitute && (
                  <span className="substitute-badge">Substitute</span>
                )}
              </div>

              <div className="cart-item-details">
                <div className="detail-row">
                  <span className="detail-label">Brand:</span>
                  <span className="detail-value">{item.brand}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Quantity:</span>
                  <span className="detail-value">{item.quantity}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Price per unit:</span>
                  <span className="detail-value">${item.price.toFixed(2)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Item total:</span>
                  <span className="detail-value item-total">${itemTotal.toFixed(2)}</span>
                </div>
              </div>

              {explanation && (
                <div className="cart-item-explanation">
                  <span className="explanation-icon">ℹ️</span>
                  <span className="explanation-text">{explanation}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="cart-summary">
        <div className="summary-row">
          <span className="summary-label">Total Items:</span>
          <span className="summary-value">{cart.items.length}</span>
        </div>
        <div className="summary-row total-row">
          <span className="summary-label">Total Price:</span>
          <span className="summary-value total-price">${cart.totalPrice.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
