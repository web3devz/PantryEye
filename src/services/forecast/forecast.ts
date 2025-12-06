/**
 * Forecast Service for PantryEye
 * Predicts item consumption and run-out dates
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1
 */

import {
  VelocityModel,
  VelocityDataPoint,
  ForecastModel,
  RestockItem,
} from '../../types';
import { inventoryService } from '../inventory/inventory';

/**
 * ForecastService class
 * Handles consumption velocity computation and run-out forecasting
 */
export class ForecastService {
  private velocityCache: Map<string, VelocityModel> = new Map();
  private forecastCache: Map<string, ForecastModel> = new Map();

  // Exponential smoothing factor (alpha)
  // Higher values give more weight to recent observations
  private readonly SMOOTHING_FACTOR = 0.3;

  /**
   * Compute consumption velocity for a SKU
   * Requirement 5.1, 5.2, 5.4
   * 
   * Formula: (prev_qty - curr_qty) / days_elapsed
   * Applies exponential smoothing to reduce noise
   * 
   * @param sku - SKU ID to compute velocity for
   * @returns Smoothed velocity (quantity per day), or 0 if insufficient data
   */
  async computeVelocity(sku: string): Promise<number> {
    // Get inventory item
    const item = await inventoryService.getItem(sku);
    if (!item) {
      return 0;
    }

    // Requirement 5.4: Need at least 2 data points
    if (item.history.length < 2) {
      return 0;
    }

    // Compute velocity data points from history
    const dataPoints: VelocityDataPoint[] = [];
    
    for (let i = 1; i < item.history.length; i++) {
      const prev = item.history[i - 1];
      const curr = item.history[i];

      // Calculate days elapsed
      const daysElapsed = (curr.timestamp.getTime() - prev.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      
      // Skip if timestamps are too close (less than 1 hour)
      if (daysElapsed < 1 / 24) {
        continue;
      }

      // Requirement 5.1: Compute velocity using formula
      const velocity = (prev.quantity - curr.quantity) / daysElapsed;

      dataPoints.push({
        timestamp: curr.timestamp,
        quantity: curr.quantity,
        velocity,
      });
    }

    // If no valid data points after filtering, return 0
    if (dataPoints.length === 0) {
      return 0;
    }

    // Requirement 5.2: Apply exponential smoothing
    let smoothedVelocity = dataPoints[0].velocity;
    
    for (let i = 1; i < dataPoints.length; i++) {
      const rawVelocity = dataPoints[i].velocity;
      smoothedVelocity = this.SMOOTHING_FACTOR * rawVelocity + (1 - this.SMOOTHING_FACTOR) * smoothedVelocity;
    }

    // Update velocity cache
    const velocityModel: VelocityModel = {
      sku,
      dataPoints,
      smoothedVelocity,
      lastComputed: new Date(),
    };
    this.velocityCache.set(sku, velocityModel);

    return smoothedVelocity;
  }

  /**
   * Forecast run-out date for a SKU
   * Requirement 5.3, 5.5
   * 
   * Formula: current_qty / smoothed_velocity
   * 
   * @param sku - SKU ID to forecast
   * @returns Forecasted run-out date, or null if cannot forecast
   */
  async forecastRunout(sku: string): Promise<Date | null> {
    // Get inventory item
    const item = await inventoryService.getItem(sku);
    if (!item) {
      return null;
    }

    // Compute velocity
    const velocity = await this.computeVelocity(sku);

    // Cannot forecast if velocity is 0 or negative (item not being consumed)
    if (velocity <= 0) {
      return null;
    }

    // Requirement 5.3: Forecast run-out days using formula
    const daysUntilRunout = item.quantity / velocity;

    // Calculate run-out date
    const runoutDate = new Date();
    runoutDate.setDate(runoutDate.getDate() + daysUntilRunout);

    // Requirement 5.5: Store forecast with timestamp
    const forecastModel: ForecastModel = {
      sku,
      currentQuantity: item.quantity,
      velocity,
      forecastedRunoutDate: runoutDate,
      confidence: this.calculateConfidence(item.history.length, velocity),
    };
    this.forecastCache.set(sku, forecastModel);

    return runoutDate;
  }

  /**
   * Get items that need restocking based on run-out threshold
   * Requirement 6.1
   * 
   * @param thresholdDays - Number of days threshold (default: 5)
   * @returns Array of items needing restock with forecast details
   */
  async getItemsNeedingRestock(thresholdDays: number = 5): Promise<RestockItem[]> {
    const restockItems: RestockItem[] = [];

    // Get all inventory items
    const inventory = await inventoryService.getInventory();

    // Process each item
    for (const item of inventory) {
      // Forecast run-out date
      const runoutDate = await this.forecastRunout(item.sku.id);

      // Skip if cannot forecast
      if (!runoutDate) {
        continue;
      }

      // Calculate days until run-out
      const now = new Date();
      const daysUntilRunout = (runoutDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      // Requirement 6.1: Filter by threshold
      if (daysUntilRunout <= thresholdDays) {
        // Get velocity from cache (already computed in forecastRunout)
        const velocityModel = this.velocityCache.get(item.sku.id);
        const velocity = velocityModel?.smoothedVelocity || 0;

        restockItems.push({
          sku: item.sku,
          currentQuantity: item.quantity,
          forecastedRunoutDate: runoutDate,
          daysUntilRunout,
          velocity,
        });
      }
    }

    // Sort by days until run-out (most urgent first)
    restockItems.sort((a, b) => a.daysUntilRunout - b.daysUntilRunout);

    return restockItems;
  }

  /**
   * Calculate forecast confidence based on data quality
   * More data points and consistent velocity = higher confidence
   * 
   * @param dataPointCount - Number of historical data points
   * @param velocity - Computed velocity
   * @returns Confidence score between 0 and 1
   */
  private calculateConfidence(dataPointCount: number, velocity: number): number {
    // Base confidence on number of data points
    let confidence = Math.min(dataPointCount / 10, 1.0);

    // Reduce confidence if velocity is very low (less predictable)
    if (velocity < 0.1) {
      confidence *= 0.5;
    }

    return confidence;
  }

  /**
   * Clear the velocity and forecast caches
   * Useful for testing or when inventory changes significantly
   */
  clearCache(): void {
    this.velocityCache.clear();
    this.forecastCache.clear();
  }
}

// Singleton instance
export const forecastService = new ForecastService();
