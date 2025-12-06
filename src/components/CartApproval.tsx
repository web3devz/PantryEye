/**
 * Cart Approval Component
 * Requirements: 7.3, 7.5
 * Provides Approve, Edit, Reject buttons and shows order confirmation
 */

import { useState } from 'react';
import { DraftCart, OrderConfirmation } from '../types';
import { DraftCartDisplay } from './DraftCartDisplay';
import { cartService } from '../services/cart/cart';

interface CartApprovalProps {
  cart: DraftCart;
  onEdit: () => void;
  onReject: () => void;
  onComplete: () => void;
}

export function CartApproval({ cart, onEdit, onReject, onComplete }: CartApprovalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmation | null>(null);

  const handleApprove = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Requirement 7.5: Call CartService.submitOrder()
      const confirmation = await cartService.submitOrder(cart);
      
      setOrderConfirmation(confirmation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = () => {
    if (window.confirm('Are you sure you want to reject this cart? All items will be removed.')) {
      onReject();
    }
  };

  // Show order confirmation after successful approval
  if (orderConfirmation) {
    return (
      <div className="order-confirmation">
        <div className="success-icon">✓</div>
        <h3>Order Placed Successfully!</h3>
        
        <div className="order-details">
          <div className="detail-row">
            <span className="detail-label">Order ID:</span>
            <span className="detail-value">
              <span className="order-id">{orderConfirmation.orderId}</span>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Vendor:</span>
            <span className="detail-value">{orderConfirmation.vendor}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Items:</span>
            <span className="detail-value">{orderConfirmation.items.length}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Total:</span>
            <span className="detail-value">${orderConfirmation.totalPrice.toFixed(2)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Estimated Delivery:</span>
            <span className="detail-value">
              {orderConfirmation.estimatedDelivery.toLocaleDateString()}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Order Date:</span>
            <span className="detail-value">
              {orderConfirmation.timestamp.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="confirmation-actions">
          <button onClick={onComplete} className="primary-button">
            Done
          </button>
        </div>
      </div>
    );
  }

  // Show cart with approval actions
  return (
    <div className="cart-approval">
      <DraftCartDisplay cart={cart} />

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="cart-actions">
        <button
          onClick={handleApprove}
          disabled={isSubmitting || cart.items.length === 0}
          className="primary-button approve-button"
        >
          {isSubmitting ? 'Submitting Order...' : 'Approve & Order'}
        </button>
        <button
          onClick={onEdit}
          disabled={isSubmitting || cart.items.length === 0}
          className="secondary-button edit-cart-button"
        >
          Edit Cart
        </button>
        <button
          onClick={handleReject}
          disabled={isSubmitting}
          className="secondary-button reject-cart-button"
        >
          Reject Cart
        </button>
      </div>
    </div>
  );
}
