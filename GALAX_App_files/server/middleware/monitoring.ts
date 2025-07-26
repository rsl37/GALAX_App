/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../auth.js';

// In-memory metrics store (in production, use Redis or similar)
interface MetricsStore {
  requests: {
    total: number;
    by_endpoint: Record<string, number>;
    by_method: Record<string, number>;
    by_status: Record<string, number>;
    by_version: Record<string, number>;
  };
  errors: {
    total: number;
    by_type: Record<string, number>;
    recent: Array<{
      timestamp: string;
      error: string;
      endpoint: string;
      userId?: number;
      ip: string;
    }>;
  };
  performance: {
    response_times: number[];
    slow_requests: Array<{
      timestamp: string;
      endpoint: string;
      method: string;
      duration: number;
      userId?: number;
    }>;
  };
  users: {
    active_sessions: Set<number>;
    registrations_today: number;
    logins_today: number;
    last_reset: string;
  };
  features: {
    help_requests_created: number;
    crisis_alerts_created: number;
    proposals_created: number;
    votes_cast: number;
    stablecoin_transactions: number;
  };
}

const metrics: MetricsStore = {
  requests: {
    total: 0,
    by_endpoint: {},
    by_method: {},
    by_status: {},
    by_version: {}
  },
  errors: {
    total: 0,
    by_type: {},
    recent: []
  },
  performance: {
    response_times: [],
    slow_requests: []
  },
  users: {
    active_sessions: new Set(),
    registrations_today: 0,
    logins_today: 0,
    last_reset: new Date().toISOString().split('T')[0]
  },
  features: {
    help_requests_created: 0,
    crisis_alerts_created: 0,
    proposals_created: 0,
    votes_cast: 0,
    stablecoin_transactions: 0
  }
};

// Reset daily metrics
const resetDailyMetrics = () => {
  const today = new Date().toISOString().split('T')[0];
  if (metrics.users.last_reset !== today) {
    metrics.users.registrations_today = 0;
    metrics.users.logins_today = 0;
    metrics.users.last_reset = today;
  }
};

// Metrics collection middleware
export const collectMetrics = (req: Request & { startTime?: number }, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  req.startTime = startTime;

  // Reset daily metrics if needed
  resetDailyMetrics();

  // Track request
  metrics.requests.total++;
  
  const endpoint = req.route?.path || req.path;
  metrics.requests.by_endpoint[endpoint] = (metrics.requests.by_endpoint[endpoint] || 0) + 1;
  metrics.requests.by_method[req.method] = (metrics.requests.by_method[req.method] || 0) + 1;
  
  if (req.apiVersion) {
    metrics.requests.by_version[req.apiVersion] = (metrics.requests.by_version[req.apiVersion] || 0) + 1;
  }

  // Track active user session
  const userId = (req as AuthRequest).userId;
  if (userId) {
    metrics.users.active_sessions.add(userId);
  }

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    // Track response time
    metrics.performance.response_times.push(duration);
    
    // Keep only last 1000 response times
    if (metrics.performance.response_times.length > 1000) {
      metrics.performance.response_times = metrics.performance.response_times.slice(-1000);
    }
    
    // Track slow requests (>2 seconds)
    if (duration > 2000) {
      metrics.performance.slow_requests.push({
        timestamp: new Date().toISOString(),
        endpoint,
        method: req.method,
        duration,
        userId
      });
      
      // Keep only last 100 slow requests
      if (metrics.performance.slow_requests.length > 100) {
        metrics.performance.slow_requests = metrics.performance.slow_requests.slice(-100);
      }
    }
    
    // Track status codes
    metrics.requests.by_status[res.statusCode] = (metrics.requests.by_status[res.statusCode] || 0) + 1;
    
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Error tracking
export const trackError = (error: Error, req: Request, endpoint: string): void => {
  metrics.errors.total++;
  metrics.errors.by_type[error.name] = (metrics.errors.by_type[error.name] || 0) + 1;
  
  metrics.errors.recent.push({
    timestamp: new Date().toISOString(),
    error: error.message,
    endpoint,
    userId: (req as AuthRequest).userId,
    ip: req.ip || 'unknown'
  });
  
  // Keep only last 100 recent errors
  if (metrics.errors.recent.length > 100) {
    metrics.errors.recent = metrics.errors.recent.slice(-100);
  }
};

// Feature usage tracking
export const trackFeatureUsage = (feature: keyof MetricsStore['features'], userId?: number): void => {
  metrics.features[feature]++;
  
  // Could also track per-user feature usage here
  console.log(`📊 Feature usage: ${feature} (User: ${userId || 'anonymous'})`);
};

// User action tracking
export const trackUserAction = (action: 'registration' | 'login', userId?: number): void => {
  if (action === 'registration') {
    metrics.users.registrations_today++;
  } else if (action === 'login') {
    metrics.users.logins_today++;
    if (userId) {
      metrics.users.active_sessions.add(userId);
    }
  }
};

// Analytics endpoints
export const getSystemMetrics = (req: AuthRequest, res: Response): void => {
  const responseTime = metrics.performance.response_times;
  const avgResponseTime = responseTime.length > 0 
    ? responseTime.reduce((a, b) => a + b, 0) / responseTime.length 
    : 0;

  res.json({
    success: true,
    data: {
      requests: {
        total: metrics.requests.total,
        by_endpoint: Object.entries(metrics.requests.by_endpoint)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 20), // Top 20 endpoints
        by_method: metrics.requests.by_method,
        by_status: metrics.requests.by_status,
        by_version: metrics.requests.by_version
      },
      errors: {
        total: metrics.errors.total,
        error_rate: metrics.requests.total > 0 ? (metrics.errors.total / metrics.requests.total * 100).toFixed(2) + '%' : '0%',
        by_type: metrics.errors.by_type,
        recent_count: metrics.errors.recent.length
      },
      performance: {
        avg_response_time: Math.round(avgResponseTime),
        slow_requests_count: metrics.performance.slow_requests.length,
        response_time_percentiles: calculatePercentiles(responseTime)
      },
      users: {
        active_sessions: metrics.users.active_sessions.size,
        registrations_today: metrics.users.registrations_today,
        logins_today: metrics.users.logins_today
      },
      features: metrics.features,
      system: {
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        node_version: process.version,
        timestamp: new Date().toISOString()
      }
    }
  });
};

export const getPerformanceMetrics = (req: AuthRequest, res: Response): void => {
  const responseTime = metrics.performance.response_times;
  
  res.json({
    success: true,
    data: {
      response_times: {
        count: responseTime.length,
        average: responseTime.length > 0 ? Math.round(responseTime.reduce((a, b) => a + b, 0) / responseTime.length) : 0,
        percentiles: calculatePercentiles(responseTime),
        recent: responseTime.slice(-100) // Last 100 response times
      },
      slow_requests: {
        count: metrics.performance.slow_requests.length,
        threshold: 2000,
        recent: metrics.performance.slow_requests.slice(-20) // Last 20 slow requests
      },
      memory: {
        usage: process.memoryUsage(),
        heap_percentage: ((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100).toFixed(2) + '%'
      },
      cpu: {
        uptime: process.uptime()
      }
    }
  });
};

export const getErrorMetrics = (req: AuthRequest, res: Response): void => {
  res.json({
    success: true,
    data: {
      total_errors: metrics.errors.total,
      error_rate: metrics.requests.total > 0 ? (metrics.errors.total / metrics.requests.total * 100).toFixed(2) + '%' : '0%',
      errors_by_type: Object.entries(metrics.errors.by_type)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10), // Top 10 error types
      recent_errors: metrics.errors.recent.slice(-50), // Last 50 errors
      error_trends: {
        last_hour: metrics.errors.recent.filter(e => 
          new Date(e.timestamp) > new Date(Date.now() - 60 * 60 * 1000)
        ).length,
        last_24_hours: metrics.errors.recent.filter(e => 
          new Date(e.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length
      }
    }
  });
};

export const getUserMetrics = (req: AuthRequest, res: Response): void => {
  res.json({
    success: true,
    data: {
      active_sessions: metrics.users.active_sessions.size,
      daily_stats: {
        registrations: metrics.users.registrations_today,
        logins: metrics.users.logins_today,
        date: metrics.users.last_reset
      },
      feature_usage: metrics.features,
      engagement: {
        help_requests_per_user: metrics.users.active_sessions.size > 0 
          ? (metrics.features.help_requests_created / metrics.users.active_sessions.size).toFixed(2)
          : '0',
        votes_per_user: metrics.users.active_sessions.size > 0 
          ? (metrics.features.votes_cast / metrics.users.active_sessions.size).toFixed(2)
          : '0'
      }
    }
  });
};

export const getHealthMetrics = (req: AuthRequest, res: Response): void => {
  const responseTime = metrics.performance.response_times;
  const avgResponseTime = responseTime.length > 0 
    ? responseTime.reduce((a, b) => a + b, 0) / responseTime.length 
    : 0;
  
  const errorRate = metrics.requests.total > 0 ? (metrics.errors.total / metrics.requests.total) : 0;
  
  // Health score calculation (0-100)
  let healthScore = 100;
  if (avgResponseTime > 1000) healthScore -= 20; // Slow response time
  if (errorRate > 0.05) healthScore -= 30; // High error rate (>5%)
  if (metrics.performance.slow_requests.length > 10) healthScore -= 10; // Too many slow requests
  if (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal > 0.9) healthScore -= 20; // High memory usage
  
  const status = healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical';
  
  res.json({
    success: true,
    data: {
      status,
      health_score: Math.max(0, healthScore),
      checks: {
        response_time: {
          status: avgResponseTime < 1000 ? 'pass' : 'fail',
          value: Math.round(avgResponseTime),
          threshold: 1000,
          unit: 'ms'
        },
        error_rate: {
          status: errorRate < 0.05 ? 'pass' : 'fail',
          value: (errorRate * 100).toFixed(2) + '%',
          threshold: '5%'
        },
        memory_usage: {
          status: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal < 0.9 ? 'pass' : 'fail',
          value: ((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100).toFixed(2) + '%',
          threshold: '90%'
        },
        active_sessions: {
          status: metrics.users.active_sessions.size >= 0 ? 'pass' : 'fail',
          value: metrics.users.active_sessions.size
        }
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  });
};

// Utility functions
const calculatePercentiles = (values: number[]) => {
  if (values.length === 0) return { p50: 0, p90: 0, p95: 0, p99: 0 };
  
  const sorted = [...values].sort((a, b) => a - b);
  const getPercentile = (p: number) => {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  };
  
  return {
    p50: getPercentile(50),
    p90: getPercentile(90),
    p95: getPercentile(95),
    p99: getPercentile(99)
  };
};

// Export metrics for testing or external monitoring
export const getMetricsSnapshot = () => ({ ...metrics });

// Reset all metrics (useful for testing)
export const resetMetrics = () => {
  metrics.requests = { total: 0, by_endpoint: {}, by_method: {}, by_status: {}, by_version: {} };
  metrics.errors = { total: 0, by_type: {}, recent: [] };
  metrics.performance = { response_times: [], slow_requests: [] };
  metrics.users.active_sessions.clear();
  metrics.features = {
    help_requests_created: 0,
    crisis_alerts_created: 0,
    proposals_created: 0,
    votes_cast: 0,
    stablecoin_transactions: 0
  };
};