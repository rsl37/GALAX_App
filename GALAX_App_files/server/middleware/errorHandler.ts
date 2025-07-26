/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class ValidationError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.isOperational = true;
  }
}

export class AuthenticationError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
    this.isOperational = true;
  }
}

export class AuthorizationError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
    this.isOperational = true;
  }
}

export class NotFoundError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    this.isOperational = true;
  }
}

const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  // Set default error values
  let error = { ...err };
  error.message = err.message;

  // Log error details
  console.error('🚨 Error occurred:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Validation error (express-validator)
  if (err.name === 'ValidationError') {
    const message = 'Invalid input data';
    error = { statusCode: 400, message } as AppError;
  }

  // Database unique constraint error
  if (err.message.includes('UNIQUE constraint failed')) {
    let message = 'Duplicate field value entered';
    
    if (err.message.includes('users.email')) {
      message = 'Email address is already registered';
    } else if (err.message.includes('users.username')) {
      message = 'Username is already taken';
    } else if (err.message.includes('users.wallet_address')) {
      message = 'Wallet address is already registered';
    }
    
    error = { statusCode: 400, message } as AppError;
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid authentication token';
    error = { statusCode: 401, message } as AppError;
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    const message = 'Authentication token has expired';
    error = { statusCode: 401, message } as AppError;
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    let message = 'File upload error';
    
    if (err.message.includes('File too large')) {
      message = 'File size too large. Maximum size is 10MB';
    } else if (err.message.includes('Unexpected field')) {
      message = 'Invalid file field name';
    }
    
    error = { statusCode: 400, message } as AppError;
  }

  // Database connection errors
  if (err.message.includes('database') || err.message.includes('SQLITE')) {
    const message = 'Database connection error';
    error = { statusCode: 500, message } as AppError;
  }

  // Rate limiting errors
  if (err.message.includes('Too many requests')) {
    error = { statusCode: 429, message: err.message } as AppError;
  }

  // Send error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err
      })
    },
    timestamp: new Date().toISOString(),
    path: req.url
  });
};

export default errorHandler;
