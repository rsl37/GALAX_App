/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errorHandler.js';

// SQL injection patterns to detect and block
const SQL_INJECTION_PATTERNS = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, // SQL meta-characters
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i, // Typical SQL injection
  /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i, // "OR" variations
  /((\%27)|(\'))union/i, // UNION keyword
  /exec(\s|\+)+(s|x)p\w+/i, // Stored procedures
  /((\%27)|(\'))|((\%3D)|(=))|((\%3B)|(;))|((\%2D)|(\-))|((\%2B)|(\+))|((\%25)|(\%))/i
];

// XSS patterns to detect and block
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>/gi,
  /<link[^>]*>/gi,
  /expression\s*\(/gi,
  /vbscript:/gi,
  /data:text\/html/gi
];

// Enhanced input sanitization function
const sanitizeAgainstInjection = (value: string): boolean => {
  if (typeof value !== 'string') return true;
  
  // Check for SQL injection patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(value)) {
      return false;
    }
  }
  
  // Check for XSS patterns
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(value)) {
      return false;
    }
  }
  
  return true;
};

// Helper to check validation results
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg).join(', ');
    throw new ValidationError(errorMessages);
  }
  next();
};

// Security validation middleware for request body size
export const validateRequestSize = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.get('Content-Length') || '0');
  const maxSize = 50 * 1024 * 1024; // 50MB global limit
  
  if (contentLength > maxSize) {
    throw new ValidationError('Request body too large. Maximum size is 50MB.');
  }
  
  next();
};

// Enhanced security validation for all text inputs
export const validateSecureInput = (fieldName: string, required: boolean = false) => {
  const chain = required ? body(fieldName).notEmpty().withMessage(`${fieldName} is required`) : body(fieldName).optional();
  
  return chain
    .trim()
    .escape() // XSS protection
    .custom((value: string) => {
      if (!sanitizeAgainstInjection(value)) {
        throw new Error(`${fieldName} contains invalid or potentially malicious content`);
      }
      return true;
    });
};

// User registration validation
export const validateRegistration = [
  validateSecureInput('username', true)
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .escape(), // XSS protection
    
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
    .escape(), // XSS protection
    
  body('password')
    .optional()
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
    .custom((value: string) => {
      if (!sanitizeAgainstInjection(value)) {
        throw new Error('Password contains invalid characters');
      }
      return true;
    }),
    
  body('walletAddress')
    .optional()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid wallet address format')
    .escape(), // XSS protection
    
  // Custom validation to ensure either email+password, phone+password, or walletAddress
  body().custom((value, { req }) => {
    const { email, phone, password, walletAddress } = req.body;
    
    if (!email && !phone && !walletAddress) {
      throw new Error('Either email, phone number, or wallet address is required');
    }
    
    if ((email || phone) && !password) {
      throw new Error('Password is required when registering with email or phone');
    }
    
    if (email && phone) {
      throw new Error('Please use either email or phone number, not both');
    }
    
    return true;
  }),
  
  body('phone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Invalid phone number format')
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone number must be between 10 and 20 characters')
    .escape(), // XSS protection
    
  // Custom validation to ensure either email+password, phone+password, or walletAddress
  body().custom((value, { req }) => {
    const { email, phone, password, walletAddress } = req.body;
    
    if (!email && !phone && !walletAddress) {
      throw new Error('Either email, phone number, or wallet address is required');
    }
    
    if ((email || phone) && !password) {
      throw new Error('Password is required when registering with email or phone');
    }
    
    return true;
  }),
  
  handleValidationErrors
];

// User login validation
export const validateLogin = [
  body('email')
    .optional()
    .notEmpty()
    .withMessage('Email/username is required for email login')
    .trim(),
    
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
    .escape() // XSS protection
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Invalid phone number format')
    .trim()
    .escape(), // XSS protection
    
  body('password')
    .optional()
    .notEmpty()
    .withMessage('Password is required for email/phone login'),
    
  body('walletAddress')
    .optional()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid wallet address format'),
    
  // Custom validation to ensure proper login method
  body().custom((value, { req }) => {
    const { email, phone, password, walletAddress } = req.body;
    
    if (!email && !phone && !walletAddress) {
      throw new Error('Either email, phone, or wallet address is required');
    }
    
    if ((email || phone) && !password) {
      throw new Error('Password is required for email/phone login');
    }
    
    if (email && phone) {
      throw new Error('Please use either email or phone number, not both');
    }
    
    return true;
  }),
  
  handleValidationErrors
];

// Profile update validation
export const validateProfileUpdate = [
  validateSecureInput('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .escape(), // XSS protection
    
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
    .escape(), // XSS protection
    
  validateSecureInput('skills')
    .isLength({ max: 500 })
    .withMessage('Skills description cannot exceed 500 characters'),
    
  validateSecureInput('bio')
    .isLength({ max: 1000 })
    .withMessage('Bio cannot exceed 1000 characters'),
    
  handleValidationErrors
];

// Help request validation
export const validateHelpRequest = [
  validateSecureInput('title', true)
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
    
  validateSecureInput('description', true)
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
    
  body('category')
    .isIn(['emergency', 'transportation', 'food', 'housing', 'healthcare', 'education', 'technology', 'other'])
    .withMessage('Invalid category')
    .escape(), // XSS protection
    
  body('urgency')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid urgency level')
    .escape(), // XSS protection
    
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
    
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
    
  body('skillsNeeded')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Skills needed cannot exceed 10 items'),
    
  handleValidationErrors
];

// Crisis alert validation
export const validateCrisisAlert = [
  validateSecureInput('title', true)
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
    
  validateSecureInput('description', true)
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
    
  body('severity')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity level')
    .escape(), // XSS protection
    
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required'),
    
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required'),
    
  body('radius')
    .optional()
    .isInt({ min: 100, max: 50000 })
    .withMessage('Radius must be between 100 and 50000 meters'),
    
  handleValidationErrors
];

// Proposal validation
export const validateProposal = [
  validateSecureInput('title', true)
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
    
  validateSecureInput('description', true)
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
    
  body('category')
    .isIn(['infrastructure', 'budget', 'policy', 'community', 'environment', 'other'])
    .withMessage('Invalid category')
    .escape(), // XSS protection
    
  body('deadline')
    .isISO8601()
    .withMessage('Invalid deadline format')
    .custom((value) => {
      const deadline = new Date(value);
      const now = new Date();
      const minDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
      
      if (deadline <= minDeadline) {
        throw new Error('Deadline must be at least 24 hours in the future');
      }
      
      return true;
    }),
    
  handleValidationErrors
];

// Vote validation
export const validateVote = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid proposal ID'),
    
  body('vote_type')
    .isIn(['for', 'against'])
    .withMessage('Vote type must be either "for" or "against"'),
    
  handleValidationErrors
];

// Password reset validation
export const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  handleValidationErrors
];

export const validatePasswordResetConfirm = [
  body('token')
    .isLength({ min: 32, max: 128 })
    .withMessage('Invalid reset token')
    .trim(),
    
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
  handleValidationErrors
];

// Email verification validation
export const validateEmailVerification = [
  body('token')
    .isLength({ min: 32, max: 128 })
    .withMessage('Invalid verification token')
    .trim(),
    
  handleValidationErrors
];

// Phone verification validation
export const validatePhoneVerification = [
  body('phone')
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
    
  handleValidationErrors
];

export const validatePhoneVerificationConfirm = [
  body('phone')
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
    
  body('code')
    .isLength({ min: 4, max: 8 })
    .withMessage('Invalid verification code')
    .isNumeric()
    .withMessage('Verification code must be numeric'),
    
  handleValidationErrors
];

// General pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  handleValidationErrors
];

// Enhanced file upload validation with comprehensive security
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next();
  }
  
  const file = req.file;
  
  // Allowed MIME types with more comprehensive list
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'audio/ogg',
    'application/pdf'  // Allow PDFs for documents
  ];
  
  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new ValidationError('Invalid file type. Only images, videos, audio files, and PDFs are allowed.');
  }
  
  // Check file size (10MB for media, 5MB for PDFs)
  const maxSize = file.mimetype === 'application/pdf' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSize) {
    const limit = file.mimetype === 'application/pdf' ? '5MB' : '10MB';
    throw new ValidationError(`File size too large. Maximum size is ${limit}.`);
  }
  
  // Check file extension matches MIME type (security against spoofing)
  const extension = file.originalname.split('.').pop()?.toLowerCase();
  const mimeToExtension: { [key: string]: string[] } = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'video/mp4': ['mp4'],
    'video/quicktime': ['mov'],
    'video/x-msvideo': ['avi'],
    'video/webm': ['webm'],
    'audio/mpeg': ['mp3'],
    'audio/wav': ['wav'],
    'audio/mp4': ['m4a'],
    'audio/ogg': ['ogg'],
    'application/pdf': ['pdf']
  };
  
  const allowedExtensions = mimeToExtension[file.mimetype];
  if (!extension || !allowedExtensions?.includes(extension)) {
    throw new ValidationError('File extension does not match file type.');
  }
  
  // Check for malicious file names
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    throw new ValidationError('Invalid file name.');
  }
  
  // Basic file header validation for common formats
  const buffer = file.buffer || Buffer.alloc(0);
  if (buffer.length >= 4) {
    const header = buffer.slice(0, 4);
    const magicNumbers: { [key: string]: Buffer[] } = {
      'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
      'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
      'image/gif': [Buffer.from([0x47, 0x49, 0x46, 0x38])],
      'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])]
    };
    
    const expectedHeaders = magicNumbers[file.mimetype];
    if (expectedHeaders) {
      const isValidHeader = expectedHeaders.some(expected => 
        header.slice(0, expected.length).equals(expected)
      );
      if (!isValidHeader) {
        throw new ValidationError('File appears to be corrupted or not a valid file of the specified type.');
      }
    }
  }
  
  // Log file upload for security monitoring
  console.log('🔍 File upload security check passed:', {
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  next();
};

// Comprehensive endpoint security validation
export const validateEndpointSecurity = [
  validateRequestSize,
  body('*').optional().custom((value, { path }) => {
    // Apply security validation to all string fields
    if (typeof value === 'string' && !sanitizeAgainstInjection(value)) {
      throw new Error(`Field '${path}' contains potentially malicious content`);
    }
    return true;
  }),
  handleValidationErrors
];

// JSON payload size validation
export const validateJsonPayload = (req: Request, res: Response, next: NextFunction) => {
  if (req.is('application/json')) {
    const jsonString = JSON.stringify(req.body);
    const payloadSize = Buffer.byteLength(jsonString, 'utf8');
    const maxJsonSize = 1024 * 1024; // 1MB for JSON payloads
    
    if (payloadSize > maxJsonSize) {
      throw new ValidationError('JSON payload too large. Maximum size is 1MB.');
    }
  }
  next();
};
