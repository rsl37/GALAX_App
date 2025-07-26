/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import rateLimit from 'express-rate-limit';

// General API rate limiting
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later.',
      statusCode: 429
    },
    timestamp: new Date().toISOString()
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    console.log(`🚨 Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests from this IP, please try again later.',
        statusCode: 429
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
});

// Strict rate limiting for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 authentication attempts per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later.',
      statusCode: 429
    },
    timestamp: new Date().toISOString()
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    console.log(`🚨 Auth rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many authentication attempts, please try again later.',
        statusCode: 429
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
});

// Phone/SMS verification rate limiting
export const phoneLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // limit each IP to 3 SMS requests per 5 minutes
  message: {
    success: false,
    error: {
      message: 'Too many verification attempts, please try again later.',
      statusCode: 429
    },
    timestamp: new Date().toISOString()
  },
  handler: (req, res) => {
    console.log(`🚨 Phone verification rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many verification attempts, please try again later.',
        statusCode: 429
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
});

// Email verification rate limiting
export const emailLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // limit each IP to 3 email verification requests per 10 minutes
  message: {
    success: false,
    error: {
      message: 'Too many email verification attempts, please try again later.',
      statusCode: 429
    },
    timestamp: new Date().toISOString()
  },
  handler: (req, res) => {
    console.log(`🚨 Email verification rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many email verification attempts, please try again later.',
        statusCode: 429
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
});

// File upload rate limiting
export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // limit each IP to 20 file uploads per 10 minutes
  message: {
    success: false,
    error: {
      message: 'Too many file uploads, please try again later.',
      statusCode: 429
    },
    timestamp: new Date().toISOString()
  },
  handler: (req, res) => {
    console.log(`🚨 File upload rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many file uploads, please try again later.',
        statusCode: 429
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
});

// Password reset rate limiting
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset attempts per hour
  message: {
    success: false,
    error: {
      message: 'Too many password reset attempts, please try again later.',
      statusCode: 429
    },
    timestamp: new Date().toISOString()
  },
  handler: (req, res) => {
    console.log(`🚨 Password reset rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many password reset attempts, please try again later.',
        statusCode: 429
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
});

// Crisis alert rate limiting (stricter to prevent spam)
export const crisisLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5, // limit each IP to 5 crisis alerts per 30 minutes
  message: {
    success: false,
    error: {
      message: 'Too many crisis alerts, please try again later.',
      statusCode: 429
    },
    timestamp: new Date().toISOString()
  },
  handler: (req, res) => {
    console.log(`🚨 Crisis alert rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many crisis alerts, please try again later.',
        statusCode: 429
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
});

// Voting rate limiting (stricter to prevent vote manipulation)
export const votingLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 votes per 5 minutes
  message: {
    success: false,
    error: {
      message: 'Too many voting attempts, please try again later.',
      statusCode: 429
    },
    timestamp: new Date().toISOString()
  },
  handler: (req, res) => {
    console.log(`🚨 Voting rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many voting attempts, please try again later.',
        statusCode: 429
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
});

// Profile update rate limiting
export const profileUpdateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // limit each IP to 5 profile updates per 10 minutes
  message: {
    success: false,
    error: {
      message: 'Too many profile update attempts, please try again later.',
      statusCode: 429
    },
    timestamp: new Date().toISOString()
  },
  handler: (req, res) => {
    console.log(`🚨 Profile update rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many profile update attempts, please try again later.',
        statusCode: 429
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
});

// Create rate limiter with custom config
export const createRateLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        message,
        statusCode: 429
      },
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.log(`🚨 Custom rate limit exceeded for IP: ${req.ip} on ${req.path}`);
      res.status(429).json({
        success: false,
        error: {
          message,
          statusCode: 429
        },
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  });
};
