/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../database.js';

// Track failed login attempts per IP and email
const failedAttempts = new Map<string, { count: number; lastAttempt: Date; lockUntil?: Date }>();

// Account lockout configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 60 * 60 * 1000; // 1 hour window

export const accountLockoutMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email } = req.body;
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
  const key = `${clientIP}-${email || 'no-email'}`;
  
  const now = new Date();
  const attempt = failedAttempts.get(key);
  
  // Check if account is currently locked
  if (attempt && attempt.lockUntil && now < attempt.lockUntil) {
    const remainingTime = Math.ceil((attempt.lockUntil.getTime() - now.getTime()) / 1000 / 60);
    console.log(`🔒 Account locked for IP ${clientIP}, email ${email}. Remaining: ${remainingTime} minutes`);
    
    res.status(423).json({
      success: false,
      error: {
        message: `Account temporarily locked due to too many failed attempts. Try again in ${remainingTime} minutes.`,
        statusCode: 423,
        lockoutRemaining: remainingTime
      },
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  // Clean up old attempts outside the window
  if (attempt && (now.getTime() - attempt.lastAttempt.getTime()) > ATTEMPT_WINDOW) {
    failedAttempts.delete(key);
  }
  
  req.lockoutKey = key;
  next();
};

export const recordFailedAttempt = (key: string) => {
  const now = new Date();
  const attempt = failedAttempts.get(key) || { count: 0, lastAttempt: now };
  
  attempt.count += 1;
  attempt.lastAttempt = now;
  
  // Lock account if max attempts reached
  if (attempt.count >= MAX_ATTEMPTS) {
    attempt.lockUntil = new Date(now.getTime() + LOCKOUT_DURATION);
    console.log(`🚨 Account locked due to ${attempt.count} failed attempts: ${key}`);
  }
  
  failedAttempts.set(key, attempt);
};

export const recordSuccessfulAttempt = (key: string) => {
  // Clear failed attempts on successful login
  failedAttempts.delete(key);
};

// Clean up expired lockouts periodically
setInterval(() => {
  const now = new Date();
  for (const [key, attempt] of failedAttempts.entries()) {
    if (attempt.lockUntil && now > attempt.lockUntil) {
      // Remove lockout but keep reduced attempt count
      attempt.lockUntil = undefined;
      attempt.count = Math.max(0, attempt.count - 2); // Reduce count on expiry
      
      if (attempt.count === 0) {
        failedAttempts.delete(key);
      } else {
        failedAttempts.set(key, attempt);
      }
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// Extend Request type to include lockoutKey
declare global {
  namespace Express {
    interface Request {
      lockoutKey?: string;
    }
  }
}