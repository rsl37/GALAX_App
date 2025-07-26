/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * Stablecoin Service
 * Main service orchestrating the algorithmic stablecoin functionality
 */

import { StablecoinContract, StablecoinConfig, SupplyAdjustment, DEFAULT_STABLECOIN_CONFIG } from './StablecoinContract.js';
import { PriceOracle, OracleConfig, DEFAULT_ORACLE_CONFIG, PriceData } from './PriceOracle.js';
import { db } from '../database.js';
import { sql } from 'kysely';

export interface StablecoinTransaction {
  id?: number;
  user_id: number;
  transaction_type: 'mint' | 'burn' | 'transfer' | 'rebalance';
  amount: number;
  price_at_time: number;
  gas_fee: number;
  status: 'pending' | 'completed' | 'failed';
  created_at?: string;
  updated_at?: string;
}

export interface UserStablecoinBalance {
  user_id: number;
  crowds_balance: number;
  locked_balance: number;
  last_rebalance_participation: string | null;
}

export class StablecoinService {
  private contract: StablecoinContract;
  private oracle: PriceOracle;
  private isRunning: boolean = false;
  private rebalanceTimer: NodeJS.Timeout | null = null;

  constructor(
    contractConfig: StablecoinConfig = DEFAULT_STABLECOIN_CONFIG,
    oracleConfig: OracleConfig = DEFAULT_ORACLE_CONFIG
  ) {
    this.contract = new StablecoinContract(contractConfig);
    this.oracle = new PriceOracle(oracleConfig);
    
    // Connect oracle to contract
    this.oracle.addPriceListener((priceData: PriceData) => {
      this.contract.addPriceData(priceData);
    });

    this.initializeDatabase();
  }

  /**
   * Initialize database tables for stablecoin
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Create stablecoin transactions table
      await db.schema
        .createTable('stablecoin_transactions')
        .ifNotExists()
        .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
        .addColumn('user_id', 'integer', col => col.notNull().references('users.id'))
        .addColumn('transaction_type', 'text', col => col.notNull())
        .addColumn('amount', 'real', col => col.notNull())
        .addColumn('price_at_time', 'real', col => col.notNull())
        .addColumn('gas_fee', 'real', col => col.notNull().defaultTo(0))
        .addColumn('status', 'text', col => col.notNull().defaultTo('pending'))
        .addColumn('created_at', 'text', col => col.defaultTo(sql`CURRENT_TIMESTAMP`))
        .addColumn('updated_at', 'text', col => col.defaultTo(sql`CURRENT_TIMESTAMP`))
        .execute();

      // Create stablecoin metrics table
      await db.schema
        .createTable('stablecoin_metrics')
        .ifNotExists()
        .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
        .addColumn('timestamp', 'text', col => col.notNull())
        .addColumn('total_supply', 'real', col => col.notNull())
        .addColumn('reserve_pool', 'real', col => col.notNull())
        .addColumn('current_price', 'real', col => col.notNull())
        .addColumn('target_price', 'real', col => col.notNull())
        .addColumn('deviation', 'real', col => col.notNull())
        .addColumn('volatility', 'real', col => col.notNull())
        .addColumn('stability_score', 'real', col => col.notNull())
        .execute();

      // Create supply adjustment history table  
      await db.schema
        .createTable('supply_adjustments')
        .ifNotExists()
        .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
        .addColumn('action', 'text', col => col.notNull())
        .addColumn('amount', 'real', col => col.notNull())
        .addColumn('reason', 'text', col => col.notNull())
        .addColumn('target_price', 'real', col => col.notNull())
        .addColumn('current_price', 'real', col => col.notNull())
        .addColumn('new_supply', 'real', col => col.notNull())
        .addColumn('timestamp', 'text', col => col.notNull())
        .execute();

      console.log('Stablecoin database tables initialized successfully');
    } catch (error) {
      console.error('Error initializing stablecoin database:', error);
    }
  }

  /**
   * Start the stablecoin service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    // Load initial state from database
    await this.loadState();
    
    // Start automatic rebalancing
    this.startRebalancing();
    
    console.log('Stablecoin service started');
  }

  /**
   * Stop the stablecoin service
   */
  stop(): void {
    this.isRunning = false;
    
    if (this.rebalanceTimer) {
      clearInterval(this.rebalanceTimer);
      this.rebalanceTimer = null;
    }
    
    this.oracle.stop();
    console.log('Stablecoin service stopped');
  }

  /**
   * Load initial state from database
   */
  private async loadState(): Promise<void> {
    try {
      // Get total crowds_balance from all users
      const result = await db
        .selectFrom('users')
        .select((eb) => [
          eb.fn.sum('crowds_balance').as('total_supply')
        ])
        .execute();
      
      const totalSupply = Number(result[0]?.total_supply || 0);
      
      // Initialize contract with current supply
      if (totalSupply > 0) {
        this.contract = new StablecoinContract(
          this.contract.getConfig(),
          totalSupply,
          totalSupply * 0.2 // 20% initial reserve
        );
      }
      
      console.log(`Loaded stablecoin state: ${totalSupply} total supply`);
    } catch (error) {
      console.error('Error loading stablecoin state:', error);
    }
  }

  /**
   * Start automatic rebalancing
   */
  private startRebalancing(): void {
    const rebalanceInterval = this.contract.getConfig().rebalanceInterval;
    
    this.rebalanceTimer = setInterval(async () => {
      await this.performRebalance();
    }, rebalanceInterval);
  }

  /**
   * Perform supply rebalancing
   */
  async performRebalance(): Promise<SupplyAdjustment | null> {
    try {
      const adjustment = this.contract.rebalance();
      
      if (adjustment && adjustment.action !== 'none') {
        // Save adjustment to database
        await this.saveSupplyAdjustment(adjustment);
        
        // Apply balance changes to users proportionally
        await this.applySupplyAdjustment(adjustment);
        
        // Save metrics
        await this.saveMetrics();
        
        console.log(`Rebalance executed: ${adjustment.action} ${adjustment.amount.toFixed(2)} tokens`);
      }
      
      return adjustment;
    } catch (error) {
      console.error('Error during rebalance:', error);
      return null;
    }
  }

  /**
   * Apply supply adjustment proportionally to all user balances
   */
  private async applySupplyAdjustment(adjustment: SupplyAdjustment): Promise<void> {
    try {
      const users = await db
        .selectFrom('users')
        .select(['id', 'crowds_balance'])
        .where('crowds_balance', '>', 0)
        .execute();

      if (users.length === 0) {
        return;
      }

      const totalCurrentBalance = users.reduce((sum, user) => sum + user.crowds_balance, 0);
      
      if (totalCurrentBalance === 0) {
        return;
      }

      // Calculate new balances proportionally
      for (const user of users) {
        const userProportion = user.crowds_balance / totalCurrentBalance;
        const userAdjustment = adjustment.amount * userProportion;
        
        let newBalance: number;
        
        if (adjustment.action === 'expand') {
          newBalance = user.crowds_balance + userAdjustment;
        } else {
          newBalance = Math.max(0, user.crowds_balance - userAdjustment);
        }

        // Update user balance
        await db
          .updateTable('users')
          .set({ 
            crowds_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .where('id', '=', user.id)
          .execute();

        // Record transaction
        await this.createTransaction({
          user_id: user.id,
          transaction_type: 'rebalance',
          amount: adjustment.action === 'expand' ? userAdjustment : -userAdjustment,
          price_at_time: adjustment.currentPrice,
          gas_fee: 0,
          status: 'completed'
        });
      }
    } catch (error) {
      console.error('Error applying supply adjustment:', error);
    }
  }

  /**
   * Save supply adjustment to database
   */
  private async saveSupplyAdjustment(adjustment: SupplyAdjustment): Promise<void> {
    try {
      await db
        .insertInto('supply_adjustments')
        .values({
          action: adjustment.action,
          amount: adjustment.amount,
          reason: adjustment.reason,
          target_price: adjustment.targetPrice,
          current_price: adjustment.currentPrice,
          new_supply: adjustment.newSupply,
          timestamp: new Date(adjustment.timestamp).toISOString()
        })
        .execute();
    } catch (error) {
      console.error('Error saving supply adjustment:', error);
    }
  }

  /**
   * Save current metrics to database
   */
  private async saveMetrics(): Promise<void> {
    try {
      const metrics = this.contract.getStabilityMetrics();
      const supplyInfo = this.contract.getSupplyInfo();
      
      await db
        .insertInto('stablecoin_metrics')
        .values({
          timestamp: new Date().toISOString(),
          total_supply: supplyInfo.totalSupply,
          reserve_pool: supplyInfo.reservePool,
          current_price: metrics.currentPrice,
          target_price: metrics.targetPrice,
          deviation: metrics.deviation,
          volatility: metrics.volatility,
          stability_score: metrics.stabilityScore
        })
        .execute();
    } catch (error) {
      console.error('Error saving metrics:', error);
    }
  }

  /**
   * Create a stablecoin transaction record
   */
  async createTransaction(transaction: StablecoinTransaction): Promise<number> {
    try {
      const result = await db
        .insertInto('stablecoin_transactions')
        .values({
          user_id: transaction.user_id,
          transaction_type: transaction.transaction_type,
          amount: transaction.amount,
          price_at_time: transaction.price_at_time,
          gas_fee: transaction.gas_fee,
          status: transaction.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .execute();

      return Number(result[0].insertId);
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Get user's stablecoin balance and info
   */
  async getUserBalance(userId: number): Promise<UserStablecoinBalance | null> {
    try {
      const user = await db
        .selectFrom('users')
        .select(['crowds_balance'])
        .where('id', '=', userId)
        .executeTakeFirst();

      if (!user) {
        return null;
      }

      return {
        user_id: userId,
        crowds_balance: user.crowds_balance,
        locked_balance: 0, // TODO: Implement locked balance for governance
        last_rebalance_participation: null
      };
    } catch (error) {
      console.error('Error getting user balance:', error);
      return null;
    }
  }

  /**
   * Get current stablecoin metrics
   */
  getMetrics(): {
    stability: any;
    supply: any;
    price: any;
    oracle: any;
  } {
    const stabilityMetrics = this.contract.getStabilityMetrics();
    const supplyInfo = this.contract.getSupplyInfo();
    const priceStats = this.oracle.getPriceStats(86400000); // 24 hours
    const oracleHealth = this.oracle.getHealthStatus();

    return {
      stability: stabilityMetrics,
      supply: supplyInfo,
      price: priceStats,
      oracle: oracleHealth
    };
  }

  /**
   * Get recent transactions for a user
   */
  async getUserTransactions(userId: number, limit: number = 50): Promise<StablecoinTransaction[]> {
    try {
      const results = await db
        .selectFrom('stablecoin_transactions')
        .selectAll()
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc')
        .limit(limit)
        .execute();
      
      // Map and cast the results to match the interface
      return results.map(row => ({
        ...row,
        transaction_type: row.transaction_type as 'mint' | 'burn' | 'transfer' | 'rebalance',
        status: row.status as 'pending' | 'completed' | 'failed'
      }));
    } catch (error) {
      console.error('Error getting user transactions:', error);
      return [];
    }
  }

  /**
   * Get supply adjustment history
   */
  async getSupplyHistory(limit: number = 20): Promise<SupplyAdjustment[]> {
    try {
      const records = await db
        .selectFrom('supply_adjustments')
        .selectAll()
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .execute();

      return records.map(record => ({
        action: record.action as 'expand' | 'contract' | 'none',
        amount: record.amount,
        reason: record.reason,
        targetPrice: record.target_price,
        currentPrice: record.current_price,
        newSupply: record.new_supply,
        timestamp: new Date(record.timestamp).getTime()
      }));
    } catch (error) {
      console.error('Error getting supply history:', error);
      return [];
    }
  }

  /**
   * Simulate market conditions (for testing)
   */
  simulateMarketShock(severity: number): void {
    this.oracle.simulateMarketShock(severity);
  }

  /**
   * Manual price override (for emergency situations)
   */
  setPrice(price: number): void {
    this.oracle.setPrice(price);
  }

  /**
   * Update stablecoin configuration
   */
  updateConfig(config: Partial<StablecoinConfig>): void {
    this.contract.updateConfig(config);
  }

  /**
   * Update oracle configuration
   */
  updateOracleConfig(config: Partial<OracleConfig>): void {
    this.oracle.updateConfig(config);
  }

  /**
   * Get service status
   */
  getStatus(): {
    isRunning: boolean;
    contract: any;
    oracle: any;
    lastRebalance: string;
  } {
    const contractState = this.contract.getState();
    const oracleHealth = this.oracle.getHealthStatus();

    return {
      isRunning: this.isRunning,
      contract: contractState,
      oracle: oracleHealth,
      lastRebalance: new Date(contractState.lastRebalance).toISOString()
    };
  }
}

// Export singleton instance
export const stablecoinService = new StablecoinService();