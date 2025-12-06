/**
 * Core type definitions for PantryEye
 * Requirements: 1.4, 2.2, 2.3, 2.4, 3.1, 3.2, 4.4, 5.1, 6.1, 7.1, 8.1
 */

// ============================================================================
// Authentication & User Types (Requirement 1.4)
// ============================================================================

export interface UserMetadata {
  householdMembers: number;
  brandPreferences: Map<string, string[]>; // category -> preferred brands
  spendingCap?: number;
  vendorAllowlist: string[]; // ['amazon', 'walmart']
}

// ============================================================================
// SKU & Inventory Types (Requirements 2.4, 4.4)
// ============================================================================

export interface SKU {
  id: string;
  name: string;
  category: string;
  unit: string; // 'count', 'oz', 'lb', etc.
  marketplaceIds: Map<string, string>; // vendor -> product ID
}

export interface QuantityRecord {
  quantity: number;
  timestamp: Date;
  source: 'cv' | 'receipt' | 'manual';
}

export interface DataSource {
  type: 'cv' | 'receipt' | 'manual';
  quantity: number;
  timestamp: Date;
  confidence: number;
}

export interface InventoryItem {
  sku: SKU;
  quantity: number;
  lastUpdated: Date;
  history: QuantityRecord[];
}

// ============================================================================
// Computer Vision Types (Requirements 2.2, 2.3)
// ============================================================================

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  class: string;
  confidence: number;
  boundingBox: BoundingBox;
  fillLevel: number; // 0-100%
}

// ============================================================================
// OCR & Receipt Types (Requirements 3.1, 3.2)
// ============================================================================

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  confidence: number;
}

export interface ReceiptData {
  items: ReceiptItem[];
  total: number;
  date: Date;
  vendor?: string;
  confidence: number; // overall parsing confidence
}

// ============================================================================
// Forecasting Types (Requirement 5.1)
// ============================================================================

export interface VelocityModel {
  sku: string;
  dataPoints: VelocityDataPoint[];
  smoothedVelocity: number;
  lastComputed: Date;
}

export interface VelocityDataPoint {
  timestamp: Date;
  quantity: number;
  velocity: number; // computed from previous point
}

export interface ForecastModel {
  sku: string;
  currentQuantity: number;
  velocity: number;
  forecastedRunoutDate: Date | null;
  confidence: number;
}

export interface RestockItem {
  sku: SKU;
  currentQuantity: number;
  forecastedRunoutDate: Date;
  daysUntilRunout: number;
  velocity: number;
}

// ============================================================================
// Cart & Order Types (Requirements 6.1, 7.1, 8.1)
// ============================================================================

export interface CartItem {
  sku: SKU;
  marketplaceProductId: string;
  quantity: number;
  price: number;
  brand: string;
  isSubstitute: boolean;
}

export interface DraftCart {
  items: CartItem[];
  totalPrice: number;
  vendor: string;
  explanations: Map<string, string>; // SKU -> explanation
}

export interface SubstituteOption {
  sku: SKU;
  marketplaceProductId: string;
  brand: string;
  price: number;
  ranking: number; // based on user feedback
}

export interface OrderConfirmation {
  orderId: string;
  vendor: string;
  items: CartItem[];
  totalPrice: number;
  estimatedDelivery: Date;
  timestamp: Date;
}

export interface OrderStatus {
  orderId: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  lastUpdated: Date;
}

// ============================================================================
// Marketplace Types
// ============================================================================

export interface CatalogItem {
  productId: string;
  name: string;
  brand: string;
  price: number;
  inStock: boolean;
  category: string;
}

// ============================================================================
// Storage & Audit Types
// ============================================================================

export interface AuditLogEntry {
  timestamp: Date;
  type: 'inventory_update' | 'order_placed' | 'manual_edit' | 'feedback';
  data: any;
  source: string;
}

export interface EncryptedData {
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
  salt: Uint8Array;
}

// ============================================================================
// Mapping & Feedback Types
// ============================================================================

export interface MappingFeedback {
  sku: string;
  rating: number;
  timestamp: Date;
  context: string;
}

// ============================================================================
// Inventory Update Types
// ============================================================================

export interface InventoryUpdate {
  updatedItems: InventoryItem[];
  auditLogEntries: AuditLogEntry[];
  timestamp: Date;
}
