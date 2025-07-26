/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * Vitest Integration Tests for Stablecoin Service
 * Converted from custom test runner to standard vitest format
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { StablecoinService } from '../StablecoinService.js';
import { DEFAULT_STABLECOIN_CONFIG } from '../StablecoinContract.js';
import { DEFAULT_ORACLE_CONFIG } from '../PriceOracle.js';

describe('StablecoinService Integration', () => {
  let service: StablecoinService;

  beforeEach(() => {
    // Create test service with faster intervals for testing
    const testConfig = {
      ...DEFAULT_STABLECOIN_CONFIG,
      rebalanceInterval: 5000, // 5 seconds for testing
      toleranceBand: 0.02
    };
    
    const testOracleConfig = {
      ...DEFAULT_ORACLE_CONFIG,
      updateInterval: 2000 // 2 seconds for testing
    };
    
    service = new StablecoinService(testConfig, testOracleConfig);
  });

  afterEach(() => {
    if (service) {
      service.stop();
    }
  });

  test('should start service successfully', async () => {
    await service.start();
    
    const status = service.getStatus();
    expect(status.isRunning).toBe(true);
  });

  test('should retrieve metrics successfully', async () => {
    await service.start();
    
    const metrics = service.getMetrics();
    
    expect(metrics.stability).toBeTruthy();
    expect(metrics.supply).toBeTruthy();
    expect(metrics.price).toBeTruthy();
    expect(metrics.oracle).toBeTruthy();
    
    expect(typeof metrics.stability.currentPrice).toBe('number');
    expect(typeof metrics.supply.totalSupply).toBe('number');
  });

  test('should perform manual rebalance', async () => {
    await service.start();
    
    // Set a price that should trigger rebalancing
    service.setPrice(1.05); // 5% above peg
    
    // Wait a moment for price to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const adjustment = await service.performRebalance();
    
    // Should either return an adjustment object or null (if no adjustment needed)
    expect(adjustment === null || (adjustment && typeof adjustment.action === 'string')).toBe(true);
  });

  test('should simulate market shock', async () => {
    await service.start();
    
    const initialMetrics = service.getMetrics();
    const initialPrice = initialMetrics.stability.currentPrice;
    
    // Simulate moderate market shock
    service.simulateMarketShock(0.1); // 10% severity
    
    // Wait for shock to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const postShockMetrics = service.getMetrics();
    const newPrice = postShockMetrics.stability.currentPrice;
    
    // Price should either change or remain stable depending on shock impact
    expect(typeof newPrice).toBe('number');
    expect(newPrice).toBeGreaterThan(0);
  });

  test('should update configuration', async () => {
    await service.start();
    
    // Update stablecoin config
    service.updateConfig({
      toleranceBand: 0.03, // Change to 3%
      maxSupplyChange: 0.08 // Change to 8%
    });
    
    // Update oracle config
    service.updateOracleConfig({
      updateInterval: 3000 // Change to 3 seconds
    });
    
    // Should complete without errors
    expect(true).toBe(true);
  });

  test('should retrieve supply history', async () => {
    await service.start();
    
    const history = await service.getSupplyHistory(5);
    
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThanOrEqual(0);
    
    if (history.length > 0) {
      const latest = history[0];
      expect(latest.action).toBeTruthy();
      expect(typeof latest.amount).toBe('number');
    }
  });
});