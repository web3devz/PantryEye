/**
 * Order Detail Component
 * Requirements: 8.1, 8.2
 * Shows full order information including sandbox order ID
 */

import { OrderConfirmation } from '../types';

interface OrderDetailProps {
  order: OrderConfirmation;
  onClose: () => void;
}

export function OrderDetail({ order, onClose }: OrderDetailProps) {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  return (
    <div className="order-detail">
      <div className="order-detail-header">
        <div>
          <h2>Order Details</h2>
          <p className="order-id-full">
            <strong>Order ID:</strong> {order.orderId}
          </p>
        </div>
        <button onClick={onClose} className="close-button">
          ×
        </button>
      </div>

      <div className="order-detail-content">
        <div className="detail-section">
          <h3>Order Information</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Order Date:</span>
              <span className="detail-value">{formatDate(order.timestamp)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Vendor:</span>
              <span className="detail-value">{order.vendor}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status:</span>
              <span className="detail-value">
                <span className="status-badge status-pending">Pending</span>
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Estimated Delivery:</span>
              <span className="detail-value">{formatDate(order.estimatedDelivery)}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Items Ordered</h3>
          <div className="order-items-table">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Brand</th>
                  <th>SKU</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <div className="item-name-cell">
                        {item.sku.name}
                        {item.isSubstitute && (
                          <span className="substitute-badge">Substitute</span>
                        )}
                      </div>
                    </td>
                    <td>{item.brand}</td>
                    <td className="sku-cell">{item.sku.id}</td>
                    <td className="quantity-cell">{item.quantity}</td>
                    <td className="price-cell">{formatPrice(item.price)}</td>
                    <td className="total-cell">
                      {formatPrice(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="total-label">
                    <strong>Total:</strong>
                  </td>
                  <td className="total-value">
                    <strong>{formatPrice(order.totalPrice)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="detail-section">
          <h3>Marketplace Information</h3>
          <div className="marketplace-info">
            {order.items.map((item, index) => (
              <div key={index} className="marketplace-item">
                <span className="marketplace-label">{item.sku.name}:</span>
                <span className="marketplace-id">
                  Product ID: {item.marketplaceProductId}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="order-detail-footer">
        <button onClick={onClose} className="button-secondary">
          Close
        </button>
      </div>
    </div>
  );
}
