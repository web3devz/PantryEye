/**
 * Order History Component
 * Requirements: 8.1, 8.2, 8.3
 * Displays past orders with timestamps, details, and status
 */

import { useState, useEffect } from 'react';
import { OrderConfirmation } from '../types';
import { storageService } from '../services/storage/storage';
import { STORES } from '../services/db/schema';

interface OrderHistoryProps {
  onSelectOrder?: (order: OrderConfirmation) => void;
}

export function OrderHistory({ onSelectOrder }: OrderHistoryProps) {
  const [orders, setOrders] = useState<OrderConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all order keys
      const orderKeys = await storageService.getAllKeys(STORES.ORDER);

      // Retrieve all orders
      const loadedOrders: OrderConfirmation[] = [];
      for (const orderId of orderKeys) {
        const order = await storageService.retrieve(STORES.ORDER, orderId);
        if (order) {
          loadedOrders.push(order);
        }
      }

      // Sort by timestamp (most recent first)
      loadedOrders.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
      });

      setOrders(loadedOrders);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Failed to load order history');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = (order: OrderConfirmation) => {
    setSelectedOrderId(order.orderId);
    if (onSelectOrder) {
      onSelectOrder(order);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="order-history">
        <h2>Order History</h2>
        <div className="loading">Loading orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-history">
        <h2>Order History</h2>
        <div className="error">{error}</div>
        <button onClick={loadOrders} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="order-history">
        <h2>Order History</h2>
        <div className="empty-state">
          <p>No orders yet</p>
          <p className="empty-state-hint">
            Orders you approve will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="order-history">
      <h2>Order History</h2>
      <div className="orders-list">
        {orders.map((order) => (
          <div
            key={order.orderId}
            className={`order-card ${selectedOrderId === order.orderId ? 'selected' : ''}`}
            onClick={() => handleOrderClick(order)}
          >
            <div className="order-header">
              <div className="order-info">
                <h3>Order #{order.orderId.slice(0, 8)}</h3>
                <span className="order-date">{formatDate(order.timestamp)}</span>
              </div>
              <div className="order-status">
                <span className="status-badge status-pending">Pending</span>
              </div>
            </div>
            
            <div className="order-details">
              <div className="order-vendor">
                <strong>Vendor:</strong> {order.vendor}
              </div>
              <div className="order-items-summary">
                <strong>Items:</strong> {order.items.length} item{order.items.length !== 1 ? 's' : ''}
              </div>
              <div className="order-total">
                <strong>Total:</strong> {formatPrice(order.totalPrice)}
              </div>
            </div>

            <div className="order-items-preview">
              {order.items.slice(0, 3).map((item, index) => (
                <div key={index} className="item-preview">
                  <span className="item-name">{item.sku.name}</span>
                  <span className="item-quantity">×{item.quantity}</span>
                  <span className="item-price">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              {order.items.length > 3 && (
                <div className="item-preview more-items">
                  +{order.items.length - 3} more item{order.items.length - 3 !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div className="order-delivery">
              <small>
                Estimated delivery: {formatDate(order.estimatedDelivery)}
              </small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
