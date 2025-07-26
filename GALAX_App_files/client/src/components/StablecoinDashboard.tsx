/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * Stablecoin Dashboard Component
 * Displays stablecoin metrics, balance, and controls
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  BarChart3,
  Shield,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';

interface StablecoinMetrics {
  stability: {
    currentPrice: number;
    targetPrice: number;
    deviation: number;
    volatility: number;
    stabilityScore: number;
  };
  supply: {
    totalSupply: number;
    reservePool: number;
    reserveRatio: number;
  };
  price: {
    current: number;
    high: number;
    low: number;
    average: number;
    volatility: number;
    change24h: number;
  };
  oracle: {
    isHealthy: boolean;
    activeSources: number;
    lastUpdate: number;
    confidence: number;
    issues: string[];
  };
}

interface UserBalance {
  user_id: number;
  crowds_balance: number;
  locked_balance: number;
  last_rebalance_participation: string | null;
}

interface SupplyAdjustment {
  action: 'expand' | 'contract' | 'none';
  amount: number;
  reason: string;
  targetPrice: number;
  currentPrice: number;
  newSupply: number;
  timestamp: number;
}

export function StablecoinDashboard() {
  const [metrics, setMetrics] = useState<StablecoinMetrics | null>(null);
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [supplyHistory, setSupplyHistory] = useState<SupplyAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStablecoinData();
    const interval = setInterval(fetchStablecoinData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStablecoinData = async () => {
    try {
      setError(null);
      
      // Fetch metrics
      const metricsResponse = await fetch('/api/stablecoin/metrics');
      if (!metricsResponse.ok) {
        throw new Error('Failed to fetch metrics');
      }
      const metricsData = await metricsResponse.json();
      setMetrics(metricsData.data);

      // Fetch user balance
      const balanceResponse = await fetch('/api/stablecoin/balance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setBalance(balanceData.data);
      }

      // Fetch supply history
      const historyResponse = await fetch('/api/stablecoin/supply-history');
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setSupplyHistory(historyData.data);
      }

    } catch (error) {
      console.error('Error fetching stablecoin data:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualRebalance = async () => {
    try {
      const response = await fetch('/api/stablecoin/rebalance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to trigger rebalance');
      }
      
      // Refresh data after rebalance
      await fetchStablecoinData();
    } catch (error) {
      console.error('Error triggering rebalance:', error);
      setError(error instanceof Error ? error.message : 'Rebalance failed');
    }
  };

  const getStabilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading stablecoin data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <span>Error loading stablecoin data</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">{error}</p>
          <Button onClick={fetchStablecoinData} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="text-center text-gray-600">
            No stablecoin data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Crowds Token Stablecoin</h1>
          <p className="text-gray-600">Algorithmic stability with protocol-controlled monetary policy</p>
        </div>
        <Button onClick={handleManualRebalance} variant="outline">
          <BarChart3 className="w-4 h-4 mr-2" />
          Manual Rebalance
        </Button>
      </div>

      {/* Price and Stability Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold">
                {metrics.stability.currentPrice.toFixed(4)}
              </span>
            </div>
            <div className="flex items-center space-x-1 mt-1">
              {getPriceChangeIcon(metrics.price.change24h)}
              <span className={`text-sm ${metrics.price.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.price.change24h.toFixed(2)}%
              </span>
              <span className="text-sm text-gray-600">24h</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stability Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className={`text-2xl font-bold ${getStabilityColor(metrics.stability.stabilityScore)}`}>
                {metrics.stability.stabilityScore.toFixed(1)}
              </span>
            </div>
            <Progress 
              value={metrics.stability.stabilityScore} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Supply</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.supply.totalSupply.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Crowds Tokens
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reserve Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics.supply.reserveRatio * 100).toFixed(1)}%
            </div>
            <Progress 
              value={metrics.supply.reserveRatio * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* User Balance */}
      {balance && (
        <Card>
          <CardHeader>
            <CardTitle>Your Crowds Token Balance</CardTitle>
            <CardDescription>
              Your stablecoin holdings and locked amounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">Available Balance</div>
                <div className="text-xl font-bold">
                  {balance.crowds_balance.toFixed(2)} CROWDS
                </div>
                <div className="text-sm text-gray-600">
                  ≈ ${(balance.crowds_balance * metrics.stability.currentPrice).toFixed(2)} USD
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Locked Balance</div>
                <div className="text-xl font-bold">
                  {balance.locked_balance.toFixed(2)} CROWDS
                </div>
                <div className="text-sm text-gray-600">Governance & Staking</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Value</div>
                <div className="text-xl font-bold">
                  ${((balance.crowds_balance + balance.locked_balance) * metrics.stability.currentPrice).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">USD Value</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Oracle Status */}
      <Card>
        <CardHeader>
          <CardTitle>Oracle Health</CardTitle>
          <CardDescription>Price feed and oracle system status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {metrics.oracle.isHealthy ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              <span className={metrics.oracle.isHealthy ? 'text-green-600' : 'text-red-600'}>
                {metrics.oracle.isHealthy ? 'Healthy' : 'Issues Detected'}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {metrics.oracle.activeSources} active sources
            </div>
            <div className="text-sm text-gray-600">
              {(metrics.oracle.confidence * 100).toFixed(1)}% confidence
            </div>
          </div>
          
          {metrics.oracle.issues.length > 0 && (
            <div className="mt-4 space-y-2">
              {metrics.oracle.issues.map((issue, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm text-yellow-600">
                  <Info className="w-4 h-4" />
                  <span>{issue}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Supply Adjustments */}
      {supplyHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Supply Adjustments</CardTitle>
            <CardDescription>
              Automatic supply changes to maintain price stability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {supplyHistory.slice(0, 5).map((adjustment, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Badge variant={
                      adjustment.action === 'expand' ? 'default' : 
                      adjustment.action === 'contract' ? 'destructive' : 'secondary'
                    }>
                      {adjustment.action.toUpperCase()}
                    </Badge>
                    <div>
                      <div className="font-medium">
                        {adjustment.amount.toLocaleString()} tokens
                      </div>
                      <div className="text-sm text-gray-600">
                        {adjustment.reason}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div>${adjustment.currentPrice.toFixed(4)}</div>
                    <div>{new Date(adjustment.timestamp).toLocaleTimeString()}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}