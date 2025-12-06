/**
 * Order Management Component
 * Requirements: 8.1, 8.2, 8.3
 * Main component for viewing order history and details
 */

import { useState } from 'react';
import { OrderConfirmation } from '../types';
import { OrderHistory } from './OrderHistory';
import { OrderDetail } from './OrderDetail';

export function OrderManagement() {
  const [selectedOrder, setSelectedOrder] = useState<OrderConfirmation | null>(null);

  const handleSelectOrder = (order: OrderConfirmation) => {
    setSelectedOrder(order);
  };

  const handleCloseDetail = () => {
    setSelectedOrder(null);
  };

  return (
    <div className="order-management">
      {selectedOrder ? (
        <OrderDetail order={selectedOrder} onClose={handleCloseDetail} />
      ) : (
        <OrderHistory onSelectOrder={handleSelectOrder} />
      )}
    </div>
  );
}
