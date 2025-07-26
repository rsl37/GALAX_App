/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * Price Oracle Service
 * Simulates price feeds for the Crowds Token stablecoin
 * In production, this would integrate with real price feeds like Chainlink, Band Protocol, etc.
 */

// Define PriceData interface locally to avoid circular dependency
export interface PriceData {
  price: number;
  timestamp: number;
  volume: number;
  confidence: number; // Price confidence score 0-1
}

export interface PriceSource {
  name: string;
  url?: string;
  weight: number; // Weight in price aggregation (0-1)
  lastUpdate: number;
  isActive: boolean;
}

export interface OracleConfig {
  sources: PriceSource[];
  updateInterval: number; // Price update interval in ms
  maxPriceAge: number; // Max age of price data before considered stale
  minConfidence: number; // Minimum confidence threshold
  volatilityThreshold: number; // Price change threshold for alerts
}

export class PriceOracle {
  private config: OracleConfig;
  private currentPrice: number;
  private priceHistory: PriceData[] = [];
  private updateTimer: NodeJS.Timeout | null = null;
  private listeners: ((price: PriceData) => void)[] = [];

  constructor(config: OracleConfig, initialPrice: number = 1.0) {
    this.config = config;
    this.currentPrice = initialPrice;
    this.startPriceUpdates();
  }

  /**
   * Start automatic price updates
   */
  private startPriceUpdates(): void {
    this.updateTimer = setInterval(() => {
      this.updatePrice();
    }, this.config.updateInterval);
  }

  /**
   * Stop automatic price updates
   */
  stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Simulate price updates (in production, this would fetch from real sources)
   */
  private updatePrice(): void {
    // Simulate realistic price movements
    const volatility = 0.001; // 0.1% volatility per update
    const meanReversion = 0.02; // 2% mean reversion strength
    const targetPrice = 1.0;
    
    // Add random walk with mean reversion
    const randomFactor = (Math.random() - 0.5) * 2 * volatility;
    const meanReversionFactor = (targetPrice - this.currentPrice) * meanReversion;
    
    const priceChange = randomFactor + meanReversionFactor;
    this.currentPrice = Math.max(0.01, this.currentPrice + priceChange);

    // Create price data
    const priceData: PriceData = {
      price: this.currentPrice,
      timestamp: Date.now(),
      volume: this.simulateVolume(),
      confidence: this.calculateConfidence()
    };

    // Add to history
    this.priceHistory.push(priceData);
    
    // Keep only last 1000 price points
    if (this.priceHistory.length > 1000) {
      this.priceHistory = this.priceHistory.slice(-1000);
    }

    // Notify listeners
    this.notifyListeners(priceData);
  }

  /**
   * Simulate trading volume
   */
  private simulateVolume(): number {
    // Base volume with some randomness
    const baseVolume = 10000;
    const volatilityMultiplier = Math.abs(this.currentPrice - 1.0) * 5 + 1;
    const randomMultiplier = 0.5 + Math.random();
    
    return baseVolume * volatilityMultiplier * randomMultiplier;
  }

  /**
   * Calculate price confidence based on various factors
   */
  private calculateConfidence(): number {
    let confidence = 1.0;
    
    // Reduce confidence if price deviates too much from target
    const deviation = Math.abs(this.currentPrice - 1.0);
    confidence *= Math.max(0.3, 1 - deviation * 2);
    
    // Reduce confidence if recent volatility is high
    if (this.priceHistory.length > 10) {
      const recentPrices = this.priceHistory.slice(-10).map(p => p.price);
      const mean = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
      const variance = recentPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / recentPrices.length;
      const volatility = Math.sqrt(variance) / mean;
      
      confidence *= Math.max(0.5, 1 - volatility * 10);
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Get current price data
   */
  getCurrentPrice(): PriceData | null {
    if (this.priceHistory.length === 0) {
      return null;
    }
    return this.priceHistory[this.priceHistory.length - 1];
  }

  /**
   * Get price history
   */
  getPriceHistory(limit: number = 100): PriceData[] {
    return this.priceHistory.slice(-limit);
  }

  /**
   * Get price statistics
   */
  getPriceStats(periodMs: number): {
    current: number;
    high: number;
    low: number;
    average: number;
    volatility: number;
    change24h: number;
  } {
    const cutoffTime = Date.now() - periodMs;
    const periodPrices = this.priceHistory.filter(p => p.timestamp >= cutoffTime);
    
    if (periodPrices.length === 0) {
      return {
        current: this.currentPrice,
        high: this.currentPrice,
        low: this.currentPrice,
        average: this.currentPrice,
        volatility: 0,
        change24h: 0
      };
    }

    const prices = periodPrices.map(p => p.price);
    const current = this.currentPrice;
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    
    // Calculate volatility (standard deviation)
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - average, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance);
    
    // Calculate 24h change
    const change24h = periodPrices.length > 0 ? 
      ((current - periodPrices[0].price) / periodPrices[0].price) * 100 : 0;

    return {
      current,
      high,
      low,
      average,
      volatility,
      change24h
    };
  }

  /**
   * Add price listener
   */
  addPriceListener(callback: (price: PriceData) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove price listener
   */
  removePriceListener(callback: (price: PriceData) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of price update
   */
  private notifyListeners(priceData: PriceData): void {
    this.listeners.forEach(listener => {
      try {
        listener(priceData);
      } catch (error) {
        console.error('Error in price listener:', error);
      }
    });
  }

  /**
   * Manually set price (for testing or emergency situations)
   */
  setPrice(price: number, volume: number = 0): void {
    this.currentPrice = Math.max(0.01, price);
    
    const priceData: PriceData = {
      price: this.currentPrice,
      timestamp: Date.now(),
      volume,
      confidence: this.calculateConfidence()
    };

    this.priceHistory.push(priceData);
    this.notifyListeners(priceData);
  }

  /**
   * Simulate market shock (for testing)
   */
  simulateMarketShock(severity: number): void {
    const shockFactor = (Math.random() - 0.5) * 2 * severity;
    const newPrice = this.currentPrice * (1 + shockFactor);
    this.setPrice(newPrice, this.simulateVolume() * 3);
  }

  /**
   * Get oracle health status
   */
  getHealthStatus(): {
    isHealthy: boolean;
    activeSources: number;
    lastUpdate: number;
    confidence: number;
    issues: string[];
  } {
    const now = Date.now();
    const lastUpdate = this.priceHistory.length > 0 ? 
      this.priceHistory[this.priceHistory.length - 1].timestamp : 0;
    
    const issues: string[] = [];
    let isHealthy = true;

    // Check if price data is stale
    if (now - lastUpdate > this.config.maxPriceAge) {
      issues.push('Price data is stale');
      isHealthy = false;
    }

    // Check confidence level
    const currentData = this.getCurrentPrice();
    const confidence = currentData?.confidence || 0;
    
    if (confidence < this.config.minConfidence) {
      issues.push('Low price confidence');
      isHealthy = false;
    }

    // Check for excessive volatility
    const stats = this.getPriceStats(3600000); // 1 hour
    if (stats.volatility > this.config.volatilityThreshold) {
      issues.push('High volatility detected');
    }

    return {
      isHealthy,
      activeSources: this.config.sources.filter(s => s.isActive).length,
      lastUpdate,
      confidence,
      issues
    };
  }

  /**
   * Get configuration
   */
  getConfig(): OracleConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<OracleConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Default oracle configuration
export const DEFAULT_ORACLE_CONFIG: OracleConfig = {
  sources: [
    {
      name: 'Primary DEX',
      weight: 0.4,
      lastUpdate: Date.now(),
      isActive: true
    },
    {
      name: 'Secondary DEX',
      weight: 0.3,
      lastUpdate: Date.now(),
      isActive: true
    },
    {
      name: 'CEX Average',
      weight: 0.3,
      lastUpdate: Date.now(),
      isActive: true
    }
  ],
  updateInterval: 30000, // 30 seconds
  maxPriceAge: 300000, // 5 minutes
  minConfidence: 0.7,
  volatilityThreshold: 0.05 // 5%
};