/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * Stablecoin API Routes
 * Provides REST endpoints for stablecoin operations
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../auth.js';
import { stablecoinService } from './StablecoinService.js';

interface AuthRequest extends Request {
  user?: { userId: number };
}

const router = Router();

/**
 * Get current stablecoin metrics and status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = stablecoinService.getStatus();
    const metrics = stablecoinService.getMetrics();
    
    res.json({
      success: true,
      data: {
        status,
        metrics
      }
    });
  } catch (error) {
    console.error('Error getting stablecoin status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stablecoin status'
    });
  }
});

/**
 * Get user's stablecoin balance and information
 */
router.get('/balance', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const balance = await stablecoinService.getUserBalance(req.user.userId);
    
    if (!balance) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    console.error('Error getting user balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get balance'
    });
  }
});

/**
 * Get user's transaction history
 */
router.get('/transactions', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const transactions = await stablecoinService.getUserTransactions(req.user.userId, limit);
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error getting user transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions'
    });
  }
});

/**
 * Get supply adjustment history
 */
router.get('/supply-history', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const history = await stablecoinService.getSupplyHistory(limit);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error getting supply history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get supply history'
    });
  }
});

/**
 * Get detailed metrics for dashboard
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = stablecoinService.getMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics'
    });
  }
});

/**
 * Trigger manual rebalance (admin only)
 */
router.post('/rebalance', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // TODO: Add admin role check
    // For now, anyone can trigger rebalance for testing

    const adjustment = await stablecoinService.performRebalance();
    
    res.json({
      success: true,
      data: adjustment
    });
  } catch (error) {
    console.error('Error performing manual rebalance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform rebalance'
    });
  }
});

/**
 * Simulate market shock (testing only)
 */
router.post('/simulate-shock', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const { severity } = req.body;
    
    if (typeof severity !== 'number' || severity < 0 || severity > 1) {
      res.status(400).json({
        success: false,
        error: 'Severity must be a number between 0 and 1'
      });
      return;
    }

    stablecoinService.simulateMarketShock(severity);
    
    res.json({
      success: true,
      message: `Market shock simulated with severity ${severity}`
    });
  } catch (error) {
    console.error('Error simulating market shock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to simulate market shock'
    });
  }
});

/**
 * Update stablecoin configuration (admin only)
 */
router.put('/config', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // TODO: Add admin role check
    
    const config = req.body;
    stablecoinService.updateConfig(config);
    
    res.json({
      success: true,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
    });
  }
});

/**
 * Set manual price (emergency only)
 */
router.post('/set-price', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // TODO: Add admin role check
    
    const { price } = req.body;
    
    if (typeof price !== 'number' || price <= 0) {
      res.status(400).json({
        success: false,
        error: 'Price must be a positive number'
      });
      return;
    }

    stablecoinService.setPrice(price);
    
    res.json({
      success: true,
      message: `Price set to ${price}`
    });
  } catch (error) {
    console.error('Error setting price:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set price'
    });
  }
});

/**
 * Get real-time price data for charts
 */
router.get('/price-data', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const metrics = stablecoinService.getMetrics();
    
    // Get price history from oracle
    const priceHistory = metrics.price;
    
    res.json({
      success: true,
      data: {
        current: priceHistory.current,
        history: priceHistory, // This would include more detailed price points in real implementation
        stats: {
          high24h: priceHistory.high,
          low24h: priceHistory.low,
          change24h: priceHistory.change24h,
          volatility: priceHistory.volatility
        }
      }
    });
  } catch (error) {
    console.error('Error getting price data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get price data'
    });
  }
});

export default router;