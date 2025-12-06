/**
 * Inventory Management Component
 * Requirements: 10.1, 10.2, 10.4
 * Main component that manages inventory list, add/edit form, and delete confirmation
 */

import { useState } from 'react';
import { InventoryItem } from '../types';
import { InventoryList } from './InventoryList';
import { InventoryItemForm } from './InventoryItemForm';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { inventoryService } from '../services/inventory/inventory';

type DialogState = 
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'edit'; item: InventoryItem }
  | { type: 'delete'; item: InventoryItem };

export function InventoryManagement() {
  const [dialogState, setDialogState] = useState<DialogState>({ type: 'none' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleAddItem = () => {
    setDialogState({ type: 'add' });
  };

  const handleEditItem = (item: InventoryItem) => {
    setDialogState({ type: 'edit', item });
  };

  const handleDeleteItem = (item: InventoryItem) => {
    setDialogState({ type: 'delete', item });
    setDeleteError(null);
  };

  const handleSave = () => {
    setDialogState({ type: 'none' });
    // Trigger refresh of inventory list
    setRefreshKey(prev => prev + 1);
  };

  const handleCancel = () => {
    setDialogState({ type: 'none' });
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (dialogState.type !== 'delete') return;

    try {
      setDeleteLoading(true);
      setDeleteError(null);
      await inventoryService.deleteItem(dialogState.item.sku.id);
      setDialogState({ type: 'none' });
      // Trigger refresh of inventory list
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="inventory-management">
      <InventoryList
        key={refreshKey}
        onAddItem={handleAddItem}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
      />

      {dialogState.type === 'add' && (
        <InventoryItemForm
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {dialogState.type === 'edit' && (
        <InventoryItemForm
          item={dialogState.item}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {dialogState.type === 'delete' && (
        <>
          <DeleteConfirmDialog
            item={dialogState.item}
            onConfirm={handleConfirmDelete}
            onCancel={handleCancel}
          />
          {deleteLoading && (
            <div className="loading-overlay">
              <div className="loading-spinner">Deleting...</div>
            </div>
          )}
          {deleteError && (
            <div className="error-toast">
              {deleteError}
            </div>
          )}
        </>
      )}
    </div>
  );
}
