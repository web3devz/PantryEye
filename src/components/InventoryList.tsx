/**
 * Inventory List Component
 * Requirements: 10.1
 * Displays all inventory items with forecast information
 */

import { useEffect, useState } from 'react';
import { InventoryItem } from '../types';
import { inventoryService } from '../services/inventory/inventory';
import { forecastService } from '../services/forecast/forecast';
import { seedDemoData, hasDemoData } from '../services/demo/demoData';

interface InventoryItemWithForecast extends InventoryItem {
  daysUntilRunout?: number;
  forecastedRunoutDate?: Date | null;
}

interface InventoryListProps {
  onAddItem: () => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (item: InventoryItem) => void;
}

export function InventoryList({ onAddItem, onEditItem, onDeleteItem }: InventoryListProps) {
  const [items, setItems] = useState<InventoryItemWithForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [showDemoButton, setShowDemoButton] = useState(false);

  const RESTOCK_THRESHOLD_DAYS = 5;

  useEffect(() => {
    loadInventory();
    checkDemoData();
  }, []);

  const checkDemoData = async () => {
    const hasData = await hasDemoData();
    setShowDemoButton(!hasData);
  };

  const handleLoadDemoData = async () => {
    try {
      setLoadingDemo(true);
      setError(null);
      await seedDemoData();
      setShowDemoButton(false);
      await loadInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demo data');
    } finally {
      setLoadingDemo(false);
    }
  };

  const loadInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all inventory items
      const inventoryItems = await inventoryService.getInventory();

      // Enrich with forecast data
      const itemsWithForecast = await Promise.all(
        inventoryItems.map(async (item) => {
          try {
            const runoutDate = await forecastService.forecastRunout(item.sku.id);
            
            let daysUntilRunout: number | undefined;
            if (runoutDate) {
              const now = new Date();
              daysUntilRunout = (runoutDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            }

            return {
              ...item,
              forecastedRunoutDate: runoutDate,
              daysUntilRunout,
            };
          } catch (err) {
            // If forecast fails for this item, just return without forecast
            return {
              ...item,
              forecastedRunoutDate: null,
              daysUntilRunout: undefined,
            };
          }
        })
      );

      setItems(itemsWithForecast);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatForecast = (item: InventoryItemWithForecast): string => {
    // Check if item is out of stock
    if (item.quantity === 0) {
      return '⚠️ Out of stock';
    }

    // Check if we have forecast data
    if (!item.daysUntilRunout || !item.forecastedRunoutDate) {
      // No forecast available - need more history
      if (item.history.length < 2) {
        return '📊 Tracking... (need more data)';
      }
      return '✓ Sufficient stock';
    }

    const days = Math.round(item.daysUntilRunout);
    if (days < 0) {
      return '⚠️ Out of stock';
    } else if (days === 0) {
      return '🔴 Running out today';
    } else if (days === 1) {
      return '🟠 Runs out in 1 day';
    } else if (days <= 5) {
      return `🟡 Runs out in ${days} days`;
    } else {
      return `✓ ${days} days remaining`;
    }
  };

  const isLowStock = (item: InventoryItemWithForecast): boolean => {
    return item.daysUntilRunout !== undefined && item.daysUntilRunout <= RESTOCK_THRESHOLD_DAYS;
  };

  if (loading) {
    return (
      <div className="inventory-container">
        <div className="inventory-header">
          <h2>Inventory</h2>
        </div>
        <div className="loading-message">Loading inventory...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inventory-container">
        <div className="inventory-header">
          <h2>Inventory</h2>
        </div>
        <div className="error-message">{error}</div>
        <button onClick={loadInventory} className="primary-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h2>Inventory</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {showDemoButton && items.length === 0 && (
            <button 
              onClick={handleLoadDemoData} 
              disabled={loadingDemo}
              className="secondary-button"
              style={{ padding: '0.75rem 1.5rem' }}
            >
              {loadingDemo ? 'Loading...' : '🎯 Load Demo Data'}
            </button>
          )}
          <button onClick={onAddItem} className="primary-button add-item-button">
            + Add Item
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>No items in inventory yet.</p>
          <p>Add items manually or use camera/receipt capture to get started.</p>
          {showDemoButton && (
            <p style={{ marginTop: '1rem', fontSize: '1.1rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              💡 <strong>Tip:</strong> Click "Load Demo Data" to explore the app with sample items!
            </p>
          )}
        </div>
      ) : (
        <div className="inventory-table-container">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Quantity</th>
                <th>Last Updated</th>
                <th>Forecast</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.sku.id}
                  className={isLowStock(item) ? 'low-stock-row' : ''}
                >
                  <td className="sku-cell">{item.sku.id}</td>
                  <td className="name-cell">{item.sku.name}</td>
                  <td className="quantity-cell">
                    {item.quantity} {item.sku.unit}
                  </td>
                  <td className="date-cell">{formatDate(item.lastUpdated)}</td>
                  <td className={`forecast-cell ${isLowStock(item) ? 'low-stock' : ''}`}>
                    {formatForecast(item)}
                  </td>
                  <td className="actions-cell">
                    <button
                      onClick={() => onEditItem(item)}
                      className="action-button edit-button"
                      title="Edit item"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDeleteItem(item)}
                      className="action-button delete-button"
                      title="Delete item"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
