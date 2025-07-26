/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * Vitest Tests for Stablecoin Contract
 * Converted from custom test runner to standard vitest format
 */

import { describe, test, expect } from 'vitest';
import { StablecoinContract, StablecoinConfig, DEFAULT_STABLECOIN_CONFIG } from '../StablecoinContract.js';

describe('StablecoinContract', () => {
  describe('Basic Functionality', () => {
    test('should initialize contract correctly', () => {
      const contract = new StablecoinContract(DEFAULT_STABLECOIN_CONFIG, 10000, 2000);
      const supplyInfo = contract.getSupplyInfo();
      
      expect(supplyInfo.totalSupply).toBe(10000);
      expect(supplyInfo.reservePool).toBe(2000);
      expect(supplyInfo.reserveRatio).toBe(0.2);
    });

    test('should handle price data correctly', () => {
      const contract = new StablecoinContract(DEFAULT_STABLECOIN_CONFIG);
      
      contract.addPriceData({
        price: 1.05,
        timestamp: Date.now(),
        volume: 1000,
        confidence: 0.9
      });
      
      const currentPrice = contract.getCurrentPrice();
      expect(currentPrice).toBe(1.05);
    });

    test('should calculate average price correctly', () => {
      const contract = new StablecoinContract(DEFAULT_STABLECOIN_CONFIG);
      const now = Date.now();
      
      // Add several price points
      contract.addPriceData({ price: 1.0, timestamp: now - 300000, volume: 100, confidence: 1.0 });
      contract.addPriceData({ price: 1.1, timestamp: now - 200000, volume: 100, confidence: 1.0 });
      contract.addPriceData({ price: 0.9, timestamp: now - 100000, volume: 100, confidence: 1.0 });
      contract.addPriceData({ price: 1.05, timestamp: now, volume: 100, confidence: 1.0 });
      
      const avgPrice = contract.getAveragePrice(400000);
      const expected = (1.0 + 1.1 + 0.9 + 1.05) / 4;
      
      expect(Math.abs(avgPrice - expected)).toBeLessThan(0.01);
    });
  });

  describe('Supply Adjustments', () => {
    test('should expand when price is above peg', () => {
      const config: StablecoinConfig = {
        ...DEFAULT_STABLECOIN_CONFIG,
        toleranceBand: 0.01 // 1% tolerance
      };
      
      const contract = new StablecoinContract(config, 10000, 2000);
      
      // Add price data above peg
      contract.addPriceData({
        price: 1.05, // 5% above peg
        timestamp: Date.now(),
        volume: 1000,
        confidence: 1.0
      });
      
      const adjustment = contract.calculateSupplyAdjustment();
      
      expect(adjustment.action).toBe('expand');
      expect(adjustment.amount).toBeGreaterThan(0);
    });

    test('should contract when price is below peg', () => {
      const config: StablecoinConfig = {
        ...DEFAULT_STABLECOIN_CONFIG,
        toleranceBand: 0.01 // 1% tolerance
      };
      
      const contract = new StablecoinContract(config, 10000, 2000);
      
      // Add price data below peg
      contract.addPriceData({
        price: 0.95, // 5% below peg
        timestamp: Date.now(),
        volume: 1000,
        confidence: 1.0
      });
      
      const adjustment = contract.calculateSupplyAdjustment();
      
      expect(adjustment.action).toBe('contract');
      expect(adjustment.amount).toBeGreaterThan(0);
    });

    test('should take no action when price is within tolerance', () => {
      const config: StablecoinConfig = {
        ...DEFAULT_STABLECOIN_CONFIG,
        toleranceBand: 0.05 // 5% tolerance
      };
      
      const contract = new StablecoinContract(config, 10000, 2000);
      
      // Add price data within tolerance
      contract.addPriceData({
        price: 1.02, // 2% above peg, within 5% tolerance
        timestamp: Date.now(),
        volume: 1000,
        confidence: 1.0
      });
      
      const adjustment = contract.calculateSupplyAdjustment();
      
      expect(adjustment.action).toBe('none');
    });

    test('should execute supply adjustments correctly', () => {
      const config: StablecoinConfig = {
        ...DEFAULT_STABLECOIN_CONFIG,
        rebalanceInterval: 0 // Allow immediate rebalancing for testing
      };
      
      const contract = new StablecoinContract(config, 10000, 2000);
      const initialSupply = contract.getSupplyInfo().totalSupply;
      
      // Add price data to trigger expansion
      contract.addPriceData({
        price: 1.1,
        timestamp: Date.now(),
        volume: 1000,
        confidence: 1.0
      });
      
      const adjustment = contract.rebalance();
      
      expect(adjustment).toBeTruthy();
      expect(adjustment?.action).not.toBe('none');
      
      const newSupply = contract.getSupplyInfo().totalSupply;
      
      if (adjustment?.action === 'expand') {
        expect(newSupply).toBeGreaterThan(initialSupply);
      }
    });
  });

  describe('Price Stability', () => {
    test('should calculate stability metrics correctly', () => {
      const contract = new StablecoinContract(DEFAULT_STABLECOIN_CONFIG);
      
      // Add stable price data
      const baseTime = Date.now();
      for (let i = 0; i < 10; i++) {
        contract.addPriceData({
          price: 1.0 + (Math.random() - 0.5) * 0.01, // Small random variation around $1
          timestamp: baseTime + i * 60000,
          volume: 1000,
          confidence: 1.0
        });
      }
      
      const metrics = contract.getStabilityMetrics();
      
      expect(metrics.targetPrice).toBe(1.0);
      expect(metrics.deviation).toBeLessThan(0.1);
      expect(metrics.stabilityScore).toBeGreaterThan(50);
    });

    test('should detect high volatility', () => {
      const contract = new StablecoinContract(DEFAULT_STABLECOIN_CONFIG);
      
      // Add volatile price data
      const baseTime = Date.now();
      const volatilePrices = [1.0, 1.2, 0.8, 1.15, 0.85, 1.1, 0.9, 1.05, 0.95, 1.0];
      
      volatilePrices.forEach((price, i) => {
        contract.addPriceData({
          price,
          timestamp: baseTime + i * 60000,
          volume: 1000,
          confidence: 1.0
        });
      });
      
      const metrics = contract.getStabilityMetrics();
      
      expect(metrics.volatility).toBeGreaterThan(0.1);
      expect(metrics.stabilityScore).toBeLessThan(80);
    });
  });

  describe('Reserve Management', () => {
    test('should add reserves correctly', () => {
      const contract = new StablecoinContract(DEFAULT_STABLECOIN_CONFIG, 10000, 2000);
      const initialReserves = contract.getSupplyInfo().reservePool;
      
      contract.addReserves(500);
      
      const newReserves = contract.getSupplyInfo().reservePool;
      expect(newReserves).toBe(initialReserves + 500);
    });

    test('should remove reserves when sufficient backing exists', () => {
      const contract = new StablecoinContract(DEFAULT_STABLECOIN_CONFIG, 10000, 5000); // 50% reserve ratio
      
      const success = contract.removeReserves(1000);
      
      expect(success).toBe(true);
      
      const newReserves = contract.getSupplyInfo().reservePool;
      expect(newReserves).toBe(4000);
    });

    test('should prevent reserve removal that violates ratio', () => {
      const config: StablecoinConfig = {
        ...DEFAULT_STABLECOIN_CONFIG,
        reserveRatio: 0.3 // 30% minimum reserve ratio
      };
      
      const contract = new StablecoinContract(config, 10000, 3000); // Exactly at minimum
      
      const success = contract.removeReserves(100); // Would drop below minimum
      
      expect(success).toBe(false);
    });

    test('should respect reserve ratio constraints on contractions', () => {
      const config: StablecoinConfig = {
        ...DEFAULT_STABLECOIN_CONFIG,
        reserveRatio: 0.25, // 25% minimum
        toleranceBand: 0.01
      };
      
      const contract = new StablecoinContract(config, 10000, 2500); // Exactly at minimum
      
      // Add price data to trigger contraction
      contract.addPriceData({
        price: 0.9,
        timestamp: Date.now(),
        volume: 1000,
        confidence: 1.0
      });
      
      const adjustment = contract.calculateSupplyAdjustment();
      
      // Should limit contraction to maintain reserve ratio
      const wouldViolateRatio = (2500 / adjustment.newSupply) < 0.25;
      expect(wouldViolateRatio).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero supply gracefully', () => {
      const contract = new StablecoinContract(DEFAULT_STABLECOIN_CONFIG, 0, 0);
      const supplyInfo = contract.getSupplyInfo();
      
      expect(supplyInfo.reserveRatio).toBe(0);
      
      // Should handle gracefully without errors
      expect(() => contract.calculateSupplyAdjustment()).not.toThrow();
    });

    test('should respect maximum supply change limit', () => {
      const config: StablecoinConfig = {
        ...DEFAULT_STABLECOIN_CONFIG,
        maxSupplyChange: 0.05, // 5% max change
        toleranceBand: 0.01
      };
      
      const contract = new StablecoinContract(config, 10000, 2000);
      
      // Add extreme price data
      contract.addPriceData({
        price: 2.0, // 100% above peg
        timestamp: Date.now(),
        volume: 1000,
        confidence: 1.0
      });
      
      const adjustment = contract.calculateSupplyAdjustment();
      
      if (adjustment.action === 'expand') {
        const maxExpansion = 10000 * 0.05;
        expect(adjustment.amount).toBeLessThanOrEqual(maxExpansion + 1); // Small tolerance for rounding
      }
    });

    test('should handle mint and burn operations correctly', () => {
      const contract = new StablecoinContract(DEFAULT_STABLECOIN_CONFIG, 10000, 2000);
      
      // Test minting
      contract.mint(1000);
      let supplyInfo = contract.getSupplyInfo();
      expect(supplyInfo.totalSupply).toBe(11000);
      
      // Test burning
      const burnSuccess = contract.burn(2000);
      expect(burnSuccess).toBe(true);
      
      supplyInfo = contract.getSupplyInfo();
      expect(supplyInfo.totalSupply).toBe(9000);
      
      // Test burning more than supply
      const excessiveBurn = contract.burn(15000);
      expect(excessiveBurn).toBe(false);
    });

    test('should update configuration correctly', () => {
      const contract = new StablecoinContract(DEFAULT_STABLECOIN_CONFIG);
      
      const newConfig = {
        targetPrice: 2.0,
        toleranceBand: 0.1
      };
      
      contract.updateConfig(newConfig);
      
      const updatedConfig = contract.getConfig();
      expect(updatedConfig.targetPrice).toBe(2.0);
      expect(updatedConfig.toleranceBand).toBe(0.1);
    });
  });
});