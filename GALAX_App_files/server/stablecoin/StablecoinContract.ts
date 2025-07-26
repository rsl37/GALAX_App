/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * Algorithmic Stablecoin Smart Contract Simulation
 * Manages the Crowds Token as an algorithmic stablecoin with protocol-controlled monetary policies
 */

export interface StablecoinConfig {
  targetPrice: number; // Target peg price (e.g., 1.00 USD)
  toleranceBand: number; // Acceptable price deviation (e.g., 0.05 = 5%)
  supplyAdjustmentRate: number; // Rate of supply adjustment per rebalance
  reserveRatio: number; // Minimum reserve ratio required
  maxSupplyChange: number; // Maximum supply change per rebalance (e.g., 0.1 = 10%)
  rebalanceInterval: number; // Time between rebalances in milliseconds
}

export interface PriceData {
  price: number;
  timestamp: number;
  volume: number;
  confidence: number; // Price confidence score 0-1
}

export interface ReserveData {
  collateralValue: number;
  totalSupply: number;
  reserveRatio: number;
  timestamp: number;
}

export interface SupplyAdjustment {
  action: 'expand' | 'contract' | 'none';
  amount: number;
  reason: string;
  targetPrice: number;
  currentPrice: number;
  newSupply: number;
  timestamp: number;
}

export class StablecoinContract {
  private config: StablecoinConfig;
  private totalSupply: number;
  private reservePool: number;
  private lastRebalance: number;
  private priceHistory: PriceData[] = [];
  private supplyHistory: SupplyAdjustment[] = [];

  constructor(config: StablecoinConfig, initialSupply: number = 0, initialReserve: number = 0) {
    this.config = config;
    this.totalSupply = initialSupply;
    this.reservePool = initialReserve;
    this.lastRebalance = Date.now();
  }

  /**
   * Get current stablecoin configuration
   */
  getConfig(): StablecoinConfig {
    return { ...this.config };
  }

  /**
   * Update stablecoin configuration (governance controlled)
   */
  updateConfig(newConfig: Partial<StablecoinConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current supply and reserve information
   */
  getSupplyInfo(): { totalSupply: number; reservePool: number; reserveRatio: number } {
    return {
      totalSupply: this.totalSupply,
      reservePool: this.reservePool,
      reserveRatio: this.totalSupply > 0 ? this.reservePool / this.totalSupply : 0
    };
  }

  /**
   * Add price data from oracle
   */
  addPriceData(priceData: PriceData): void {
    this.priceHistory.push(priceData);
    
    // Keep only last 100 price points
    if (this.priceHistory.length > 100) {
      this.priceHistory = this.priceHistory.slice(-100);
    }
  }

  /**
   * Get current market price (latest from oracle)
   */
  getCurrentPrice(): number {
    if (this.priceHistory.length === 0) {
      return this.config.targetPrice; // Return target price if no data
    }
    return this.priceHistory[this.priceHistory.length - 1].price;
  }

  /**
   * Calculate average price over specified period
   */
  getAveragePrice(periodMs: number): number {
    const cutoffTime = Date.now() - periodMs;
    const recentPrices = this.priceHistory.filter(p => p.timestamp >= cutoffTime);
    
    if (recentPrices.length === 0) {
      return this.getCurrentPrice();
    }

    const weightedSum = recentPrices.reduce((sum, p) => sum + (p.price * p.confidence), 0);
    const weightSum = recentPrices.reduce((sum, p) => sum + p.confidence, 0);
    
    return weightSum > 0 ? weightedSum / weightSum : this.getCurrentPrice();
  }

  /**
   * Determine if rebalancing is needed and calculate supply adjustment
   */
  calculateSupplyAdjustment(): SupplyAdjustment {
    const currentPrice = this.getAveragePrice(300000); // 5-minute average
    const targetPrice = this.config.targetPrice;
    const deviation = Math.abs(currentPrice - targetPrice) / targetPrice;
    
    // Check if price is within tolerance band
    if (deviation <= this.config.toleranceBand) {
      return {
        action: 'none',
        amount: 0,
        reason: 'Price within tolerance band',
        targetPrice,
        currentPrice,
        newSupply: this.totalSupply,
        timestamp: Date.now()
      };
    }

    // Calculate supply adjustment needed
    const priceRatio = currentPrice / targetPrice;
    let adjustmentFactor: number;

    if (priceRatio > 1) {
      // Price above peg - expand supply
      adjustmentFactor = Math.min(
        (priceRatio - 1) * this.config.supplyAdjustmentRate,
        this.config.maxSupplyChange
      );
      
      const expandAmount = this.totalSupply * adjustmentFactor;
      
      return {
        action: 'expand',
        amount: expandAmount,
        reason: `Price ${currentPrice.toFixed(4)} above target ${targetPrice}, expanding supply`,
        targetPrice,
        currentPrice,
        newSupply: this.totalSupply + expandAmount,
        timestamp: Date.now()
      };
    } else {
      // Price below peg - contract supply
      adjustmentFactor = Math.min(
        (1 - priceRatio) * this.config.supplyAdjustmentRate,
        this.config.maxSupplyChange
      );
      
      const contractAmount = this.totalSupply * adjustmentFactor;
      const newSupply = Math.max(0, this.totalSupply - contractAmount);
      
      return {
        action: 'contract',
        amount: contractAmount,
        reason: `Price ${currentPrice.toFixed(4)} below target ${targetPrice}, contracting supply`,
        targetPrice,
        currentPrice,
        newSupply,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Execute supply adjustment if conditions are met
   */
  rebalance(): SupplyAdjustment | null {
    const now = Date.now();
    
    // Check if enough time has passed since last rebalance
    if (now - this.lastRebalance < this.config.rebalanceInterval) {
      return null;
    }

    const adjustment = this.calculateSupplyAdjustment();
    
    if (adjustment.action !== 'none') {
      // Check reserve requirements for contractions
      if (adjustment.action === 'contract') {
        const newReserveRatio = adjustment.newSupply > 0 ? this.reservePool / adjustment.newSupply : 1;
        
        if (newReserveRatio < this.config.reserveRatio) {
          // Insufficient reserves for full contraction
          const maxContractable = this.reservePool / this.config.reserveRatio;
          const adjustedContraction = this.totalSupply - maxContractable;
          
          adjustment.amount = adjustedContraction;
          adjustment.newSupply = maxContractable;
          adjustment.reason += ' (limited by reserve ratio)';
        }
      }

      // Execute the supply adjustment
      this.totalSupply = adjustment.newSupply;
      this.lastRebalance = now;
      this.supplyHistory.push(adjustment);

      // Keep only last 50 adjustments
      if (this.supplyHistory.length > 50) {
        this.supplyHistory = this.supplyHistory.slice(-50);
      }
    }

    return adjustment;
  }

  /**
   * Add reserves to the pool (from fees, external backing, etc.)
   */
  addReserves(amount: number): void {
    this.reservePool += amount;
  }

  /**
   * Remove reserves from the pool (for backing redemptions, etc.)
   */
  removeReserves(amount: number): boolean {
    if (amount > this.reservePool) {
      return false; // Insufficient reserves
    }
    
    const newReserveRatio = (this.reservePool - amount) / this.totalSupply;
    if (newReserveRatio < this.config.reserveRatio) {
      return false; // Would violate reserve ratio
    }
    
    this.reservePool -= amount;
    return true;
  }

  /**
   * Get recent supply adjustment history
   */
  getSupplyHistory(limit: number = 10): SupplyAdjustment[] {
    return this.supplyHistory.slice(-limit);
  }

  /**
   * Get price stability metrics
   */
  getStabilityMetrics(): {
    currentPrice: number;
    targetPrice: number;
    deviation: number;
    volatility: number;
    stabilityScore: number;
  } {
    const currentPrice = this.getCurrentPrice();
    const targetPrice = this.config.targetPrice;
    const deviation = Math.abs(currentPrice - targetPrice) / targetPrice;

    // Calculate volatility over last 24 hours
    const dayMs = 24 * 60 * 60 * 1000;
    const recentPrices = this.priceHistory.filter(p => p.timestamp >= Date.now() - dayMs);
    
    let volatility = 0;
    if (recentPrices.length > 1) {
      const prices = recentPrices.map(p => p.price);
      const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
      volatility = Math.sqrt(variance) / mean; // Coefficient of variation
    }

    // Calculate stability score (0-100)
    const deviationScore = Math.max(0, 1 - (deviation / this.config.toleranceBand)) * 50;
    const volatilityScore = Math.max(0, 1 - (volatility / 0.1)) * 50; // Target volatility < 10%
    const stabilityScore = deviationScore + volatilityScore;

    return {
      currentPrice,
      targetPrice,
      deviation,
      volatility,
      stabilityScore
    };
  }

  /**
   * Mint new tokens (expansion)
   */
  mint(amount: number): void {
    this.totalSupply += amount;
  }

  /**
   * Burn tokens (contraction)
   */
  burn(amount: number): boolean {
    if (amount > this.totalSupply) {
      return false;
    }
    this.totalSupply = Math.max(0, this.totalSupply - amount);
    return true;
  }

  /**
   * Get current contract state for debugging
   */
  getState(): any {
    return {
      config: this.config,
      totalSupply: this.totalSupply,
      reservePool: this.reservePool,
      lastRebalance: this.lastRebalance,
      currentPrice: this.getCurrentPrice(),
      stabilityMetrics: this.getStabilityMetrics(),
      supplyInfo: this.getSupplyInfo()
    };
  }
}

// Default configuration for Crowds Token stablecoin
export const DEFAULT_STABLECOIN_CONFIG: StablecoinConfig = {
  targetPrice: 1.0, // $1.00 USD
  toleranceBand: 0.02, // 2% tolerance
  supplyAdjustmentRate: 0.5, // 50% of deviation
  reserveRatio: 0.2, // 20% reserve requirement
  maxSupplyChange: 0.05, // Max 5% supply change per rebalance
  rebalanceInterval: 300000 // 5 minutes
};