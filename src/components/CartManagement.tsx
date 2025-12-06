/**
 * Cart Management Component
 * Requirements: 6.1, 7.1, 7.2, 7.3, 7.4, 7.5
 * Main component that orchestrates cart display, approval, and editing
 */

import { useState, useEffect } from 'react';
import { DraftCart } from '../types';
import { CartApproval } from './CartApproval';
import { CartEdit } from './CartEdit';
import { cartService } from '../services/cart/cart';
import { forecastService } from '../services/forecast/forecast';
import { inventoryService } from '../services/inventory/inventory';
import { storageService } from '../services/storage/storage';
import { STORES } from '../services/db/schema';

type ViewState = 'loading' | 'approval' | 'edit' | 'empty';

export function CartManagement() {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [cart, setCart] = useState<DraftCart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load or build draft cart on mount
  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setError(null);
      setViewState('loading');

      console.log('[CartManagement] Loading cart...');

      // Get user metadata for preferences
      const userMetadata = await storageService.retrieve(STORES.USER, 'current_user');
      
      if (!userMetadata) {
        console.error('[CartManagement] User metadata not found');
        setError('User metadata not found. Please log in again.');
        setViewState('empty');
        return;
      }

      console.log('[CartManagement] User metadata loaded:', userMetadata);

      // Get items needing restock (threshold: 5 days)
      let restockItems = await forecastService.getItemsNeedingRestock(5);
      console.log('[CartManagement] Forecast restock items:', restockItems.length);

      // Also get items with 0 quantity (out of stock)
      const inventory = await inventoryService.getInventory();
      console.log('[CartManagement] Total inventory items:', inventory.length);
      
      const outOfStockItems = inventory
        .filter(item => item.quantity === 0)
        .filter(item => !restockItems.some(ri => ri.sku.id === item.sku.id)); // Don't duplicate

      console.log('[CartManagement] Out of stock items:', outOfStockItems.length);

      // Add out of stock items to restock list
      for (const item of outOfStockItems) {
        restockItems.push({
          sku: item.sku,
          currentQuantity: 0,
          forecastedRunoutDate: new Date(), // Already out of stock
          daysUntilRunout: 0,
          velocity: 0.5, // Assume moderate consumption
        });
      }

      console.log('[CartManagement] Total restock items (including out of stock):', restockItems.length);

      if (restockItems.length === 0) {
        console.log('[CartManagement] No items need restocking');
        setViewState('empty');
        return;
      }

      // Build draft cart
      console.log('[CartManagement] Building draft cart...');
      const draftCart = await cartService.buildDraftCart(restockItems, userMetadata);
      console.log('[CartManagement] Draft cart built:', draftCart);
      
      if (draftCart.items.length === 0) {
        console.warn('[CartManagement] Draft cart has no items');
        setError('Unable to build cart. No products found in marketplace.');
        setViewState('empty');
        return;
      }

      setCart(draftCart);
      setViewState('approval');
    } catch (err) {
      console.error('[CartManagement] Error loading cart:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cart');
      setViewState('empty');
    }
  };

  const handleRefreshCart = async () => {
    setIsRefreshing(true);
    await loadCart();
    setIsRefreshing(false);
  };

  const handleEdit = () => {
    setViewState('edit');
  };

  const handleSaveEdit = (updatedCart: DraftCart) => {
    setCart(updatedCart);
    setViewState('approval');
  };

  const handleCancelEdit = () => {
    setViewState('approval');
  };

  const handleReject = () => {
    setCart(null);
    setViewState('empty');
  };

  const handleComplete = () => {
    setCart(null);
    setViewState('empty');
  };

  const handleDebug = async () => {
    const inventory = await inventoryService.getInventory();
    const userMetadata = await storageService.retrieve(STORES.USER, 'current_user');
    console.log('=== DEBUG INFO ===');
    console.log('Inventory items:', inventory);
    console.log('User metadata:', userMetadata);
    console.log('Items with 0 quantity:', inventory.filter(i => i.quantity === 0));
    alert(`Inventory: ${inventory.length} items\nOut of stock: ${inventory.filter(i => i.quantity === 0).length} items\nCheck console for details`);
  };

  return (
    <div className="cart-management">
      <div className="cart-management-header">
        <h2>Shopping Cart</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleRefreshCart}
            disabled={isRefreshing}
            className="primary-button refresh-cart-button"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Cart'}
          </button>
          <button
            onClick={handleDebug}
            className="secondary-button"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            Debug Info
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {viewState === 'loading' && (
        <div className="loading-message">
          <p>Building your shopping cart...</p>
        </div>
      )}

      {viewState === 'empty' && !error && (
        <div className="empty-cart">
          <p>No items need restocking at this time.</p>
          <p>Items will appear here when:</p>
          <ul style={{ textAlign: 'left', maxWidth: '500px', margin: '1rem auto' }}>
            <li>They are predicted to run out within 5 days, or</li>
            <li>They have 0 quantity in inventory</li>
          </ul>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            Tip: Add items to your inventory first, then they'll appear here when needed.
          </p>
        </div>
      )}

      {viewState === 'approval' && cart && (
        <CartApproval
          cart={cart}
          onEdit={handleEdit}
          onReject={handleReject}
          onComplete={handleComplete}
        />
      )}

      {viewState === 'edit' && cart && (
        <CartEdit
          cart={cart}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  );
}
