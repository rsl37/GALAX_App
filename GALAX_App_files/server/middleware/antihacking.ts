/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

// Added 2025-01-13 21:56:18 UTC - Comprehensive Anti-Hacking Protection System
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

// Attack pattern detection
interface AttackPattern {
  id: string;
  name: string;
  pattern: RegExp | string;
  type: 'sql_injection' | 'xss' | 'command_injection' | 'path_traversal' | 'ldap_injection' | 'xml_injection' | 'nosql_injection' | 'ddos' | 'brute_force' | 'suspicious_behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  countermeasure: string;
}

// Comprehensive attack pattern database
const ATTACK_PATTERNS: AttackPattern[] = [
  // SQL Injection patterns - made more precise to avoid false positives
  {
    id: 'SQL_UNION_ATTACK',
    name: 'SQL Union Attack',
    pattern: /(\bunion\s+select\b|\bselect\s+.*\s+union\b)/gi,
    type: 'sql_injection',
    severity: 'critical',
    description: 'SQL UNION injection attempt',
    countermeasure: 'Block request and log IP'
  },
  {
    id: 'SQL_COMMENT_INJECTION',
    name: 'SQL Comment Injection',
    pattern: /(--\s+|\/\*[\s\S]*?\*\/)/g, // More specific: requires space after -- or proper comment block
    type: 'sql_injection',
    severity: 'high',
    description: 'SQL comment injection attempt',
    countermeasure: 'Sanitize input and log attempt'
  },
  {
    id: 'SQL_STACKED_QUERIES',
    name: 'SQL Stacked Queries',
    pattern: /;\s*(select|insert|update|delete|drop|create|alter)\s+/gi,
    type: 'sql_injection',
    severity: 'critical',
    description: 'SQL stacked queries injection',
    countermeasure: 'Block request immediately'
  },
  
  // XSS patterns
  {
    id: 'XSS_SCRIPT_TAG',
    name: 'XSS Script Tag',
    pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    type: 'xss',
    severity: 'high',
    description: 'Cross-site scripting via script tags',
    countermeasure: 'Sanitize HTML and block'
  },
  {
    id: 'XSS_EVENT_HANDLER',
    name: 'XSS Event Handler',
    pattern: /on(load|click|mouseover|error|focus|blur)\s*=/gi,
    type: 'xss',
    severity: 'medium',
    description: 'XSS via HTML event handlers',
    countermeasure: 'Strip event handlers'
  },
  {
    id: 'XSS_JAVASCRIPT_URL',
    name: 'XSS JavaScript URL',
    pattern: /javascript\s*:/gi,
    type: 'xss',
    severity: 'high',
    description: 'XSS via javascript: URLs',
    countermeasure: 'Block javascript: protocol'
  },
  
  // Command Injection patterns - made more precise to avoid false positives
  {
    id: 'CMD_SHELL_OPERATORS',
    name: 'Shell Command Operators',
    pattern: /(\|\||&&|;\s*(cat|ls|dir|rm|del|chmod|ps|kill|wget|curl)\s+|`[^`]*`|\$\([^)]*\))/g,
    type: 'command_injection',
    severity: 'critical',
    description: 'Command injection via shell operators',
    countermeasure: 'Block request and alert admin'
  },
  {
    id: 'CMD_SYSTEM_COMMANDS',
    name: 'System Commands',
    pattern: /\b(cat|ls|dir|type|copy|move|del|rm|chmod|chown|ps|kill|netstat|whoami|id|uname)\s+[\/\w\-\.]+/gi,
    type: 'command_injection',
    severity: 'high',
    description: 'System command injection attempt',
    countermeasure: 'Block and log suspicious activity'
  },
  
  // Path Traversal patterns
  {
    id: 'PATH_TRAVERSAL_DOTS',
    name: 'Path Traversal Dots',
    pattern: /(\.\.[\/\\]){2,}/g,
    type: 'path_traversal',
    severity: 'high',
    description: 'Directory traversal attack',
    countermeasure: 'Normalize paths and block'
  },
  {
    id: 'PATH_TRAVERSAL_ENCODED',
    name: 'Encoded Path Traversal',
    pattern: /(%2e%2e[%2f%5c]|%2e%2e\/|%2e%2e\\)/gi,
    type: 'path_traversal',
    severity: 'high',
    description: 'URL-encoded path traversal',
    countermeasure: 'Decode and validate paths'
  },
  
  // LDAP Injection patterns
  {
    id: 'LDAP_INJECTION',
    name: 'LDAP Injection',
    pattern: /(\(\||\)\(|\*\)|\(\&)/g,
    type: 'ldap_injection',
    severity: 'medium',
    description: 'LDAP injection attempt',
    countermeasure: 'Escape LDAP special characters'
  },
  
  // XML Injection patterns
  {
    id: 'XML_EXTERNAL_ENTITY',
    name: 'XML External Entity',
    pattern: /<!ENTITY|SYSTEM|PUBLIC/gi,
    type: 'xml_injection',
    severity: 'high',
    description: 'XML External Entity (XXE) attack',
    countermeasure: 'Disable external entity resolution'
  },
  
  // NoSQL Injection patterns
  {
    id: 'NOSQL_INJECTION',
    name: 'NoSQL Injection',
    pattern: /(\$where|\$ne|\$gt|\$lt|\$or|\$and|\$regex)/gi,
    type: 'nosql_injection',
    severity: 'high',
    description: 'NoSQL injection attempt',
    countermeasure: 'Validate query structure'
  }
];

// Suspicious IP tracking
interface SuspiciousActivity {
  ip: string;
  attempts: number;
  lastAttempt: Date;
  attacks: string[];
  blocked: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const suspiciousIPs = new Map<string, SuspiciousActivity>();
const blockedIPs = new Set<string>();

// DDoS protection tracking
interface DDoSTracker {
  requestCounts: Map<string, { count: number; lastReset: Date }>;
  suspiciousPatterns: Map<string, number>;
}

const ddosTracker: DDoSTracker = {
  requestCounts: new Map(),
  suspiciousPatterns: new Map()
};

// Bot detection patterns - Updated to be less aggressive for testing and legitimate users
const BOT_USER_AGENTS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /sogou/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
  // Only block clearly malicious bots, not testing tools
  /malicious-bot/i,
  /evil-crawler/i,
  /spam-bot/i
];

// Paths that should have relaxed security for user registration
const REGISTRATION_PATHS = new Set([
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/send-email-verification'
]);

// Honeypot system
const HONEYPOT_PATHS = new Set([
  '/admin',
  '/wp-admin',
  '/phpMyAdmin',
  '/mysql',
  '/phpmyadmin',
  '/administrator',
  '/login.php',
  '/wp-login.php',
  '/.env',
  '/config.php',
  '/backup',
  '/test'
]);

// CSRF token management
const csrfTokens = new Map<string, { token: string; created: Date; used: boolean }>();

// Generate CSRF token
export const generateCSRFToken = (sessionId: string): string => {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(sessionId, {
    token,
    created: new Date(),
    used: false
  });
  
  // Clean old tokens (older than 1 hour)
  setTimeout(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [id, data] of csrfTokens.entries()) {
      if (data.created < oneHourAgo) {
        csrfTokens.delete(id);
      }
    }
  }, 60 * 60 * 1000);
  
  return token;
};

// Validate CSRF token
export const validateCSRFToken = (sessionId: string, token: string): boolean => {
  const stored = csrfTokens.get(sessionId);
  if (!stored || stored.used || stored.token !== token) {
    return false;
  }
  
  // Mark token as used (one-time use)
  stored.used = true;
  return true;
};

// Add IP to suspicious list
const addSuspiciousIP = (ip: string, attackType: string, severity: 'low' | 'medium' | 'high' | 'critical') => {
  const existing = suspiciousIPs.get(ip);
  
  if (existing) {
    existing.attempts++;
    existing.lastAttempt = new Date();
    existing.attacks.push(attackType);
    existing.severity = severity === 'critical' || existing.severity === 'critical' ? 'critical' : 
                      severity === 'high' || existing.severity === 'high' ? 'high' :
                      severity === 'medium' || existing.severity === 'medium' ? 'medium' : 'low';
    
    // Block IP after 5 suspicious attempts or any critical attack
    if (existing.attempts >= 5 || severity === 'critical') {
      existing.blocked = true;
      blockedIPs.add(ip);
      console.warn(`🚨 IP BLOCKED: ${ip} (${existing.attempts} attempts, ${severity} severity)`);
    }
  } else {
    const activity: SuspiciousActivity = {
      ip,
      attempts: 1,
      lastAttempt: new Date(),
      attacks: [attackType],
      blocked: severity === 'critical',
      severity
    };
    
    suspiciousIPs.set(ip, activity);
    
    if (severity === 'critical') {
      blockedIPs.add(ip);
      console.warn(`🚨 IP IMMEDIATELY BLOCKED: ${ip} (critical attack: ${attackType})`);
    }
  }
};

// IP blocking middleware
export const ipBlockingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
  
  if (blockedIPs.has(clientIP)) {
    console.warn(`🚫 Blocked IP attempted access: ${clientIP} -> ${req.path}`);
    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied - IP blocked due to suspicious activity',
        statusCode: 403,
        blocked: true
      },
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Attack pattern detection middleware
export const attackDetectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || '';
  const requestPath = req.path;
  
  // Skip attack detection for registration and authentication paths
  // Allow normal user input for these endpoints
  if (REGISTRATION_PATHS.has(requestPath)) {
    return next();
  }
  
  try {
    // Phone number whitelist - skip security scanning for valid phone number patterns
    const phonePattern = /^[\+]?[1-9]?[\d\s\-\(\)]{7,15}$/;
    let requestData: string;
    
    if (req.body && req.body.phone && phonePattern.test(req.body.phone)) {
      // Create sanitized request data excluding the phone field for security scanning
      const sanitizedBody = { ...req.body };
      delete sanitizedBody.phone;
      
      // Exclude headers from security scanning to avoid false positives
      requestData = JSON.stringify({
        body: sanitizedBody,
        query: req.query,
        params: req.params,
        url: req.url,
        path: req.path
      });
    } else {
      // Exclude headers from security scanning to avoid false positives
      requestData = JSON.stringify({
        body: req.body,
        query: req.query,
        params: req.params,
        url: req.url,
        path: req.path
      });
    }
    
    const detectedAttacks: AttackPattern[] = [];
    
    // Scan for attack patterns
    for (const pattern of ATTACK_PATTERNS) {
      let match = false;
      
      if (typeof pattern.pattern === 'string') {
        match = requestData.toLowerCase().includes(pattern.pattern.toLowerCase());
      } else {
        match = pattern.pattern.test(requestData);
      }
      
      if (match) {
        detectedAttacks.push(pattern);
        console.warn(`🛡️ Attack detected: ${pattern.name} from IP ${clientIP}`);
      }
    }
    
    // Handle detected attacks
    if (detectedAttacks.length > 0) {
      const criticalAttacks = detectedAttacks.filter(a => a.severity === 'critical');
      const highAttacks = detectedAttacks.filter(a => a.severity === 'high');
      
      // Add to suspicious IP tracking
      const maxSeverity = criticalAttacks.length > 0 ? 'critical' :
                          highAttacks.length > 0 ? 'high' :
                          detectedAttacks.some(a => a.severity === 'medium') ? 'medium' : 'low';
      
      const attackNames = detectedAttacks.map(a => a.name).join(', ');
      addSuspiciousIP(clientIP, attackNames, maxSeverity);
      
      // Block critical and high severity attacks immediately
      if (criticalAttacks.length > 0 || highAttacks.length > 0) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Security violation detected',
            statusCode: 403,
            attacksDetected: detectedAttacks.map(a => ({
              type: a.type,
              severity: a.severity,
              description: a.description
            }))
          },
          timestamp: new Date().toISOString()
        });
      }
    }
    
    next();
    
  } catch (error) {
    console.error('❌ Attack detection error:', error);
    next(); // Continue on error to maintain availability
  }
};

// DDoS protection middleware
export const ddosProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
  const now = new Date();
  
  // Request rate tracking (per minute)
  const current = ddosTracker.requestCounts.get(clientIP);
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  
  if (!current || current.lastReset < oneMinuteAgo) {
    ddosTracker.requestCounts.set(clientIP, { count: 1, lastReset: now });
  } else {
    current.count++;
  }
  
  const requestCount = ddosTracker.requestCounts.get(clientIP)!.count;
  
  // DDoS detection thresholds
  const WARNING_THRESHOLD = 100; // requests per minute
  const BLOCK_THRESHOLD = 200;   // requests per minute
  
  if (requestCount > BLOCK_THRESHOLD) {
    addSuspiciousIP(clientIP, 'DDoS Attack', 'critical');
    console.warn(`🚨 DDoS attack detected from IP: ${clientIP} (${requestCount} req/min)`);
    
    return res.status(429).json({
      success: false,
      error: {
        message: 'DDoS attack detected - access blocked',
        statusCode: 429,
        requestCount,
        timeWindow: '1 minute'
      },
      timestamp: new Date().toISOString()
    });
  } else if (requestCount > WARNING_THRESHOLD) {
    console.warn(`⚠️ High request rate from IP: ${clientIP} (${requestCount} req/min)`);
    addSuspiciousIP(clientIP, 'High Request Rate', 'medium');
  }
  
  next();
};

// Bot detection middleware
export const botDetectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get('User-Agent') || '';
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
  const requestPath = req.path;
  
  // Skip bot detection for registration and authentication paths
  if (REGISTRATION_PATHS.has(requestPath)) {
    return next();
  }
  
  // Check for bot user agents - only block clearly malicious bots
  const isBot = BOT_USER_AGENTS.some(pattern => pattern.test(userAgent));
  
  if (isBot) {
    console.log(`🤖 Bot detected: ${userAgent} from IP ${clientIP}`);
    
    // Allow legitimate bots
    if (userAgent.toLowerCase().includes('googlebot') || 
        userAgent.toLowerCase().includes('bingbot') ||
        userAgent.toLowerCase().includes('facebookexternalhit') ||
        userAgent.toLowerCase().includes('twitterbot') ||
        userAgent.toLowerCase().includes('linkedinbot')) {
      return next();
    } else {
      // Suspicious bot - add to monitoring but don't block immediately
      addSuspiciousIP(clientIP, 'Suspicious Bot', 'low');
      
      // Rate limit bots more strictly for non-auth endpoints
      return res.status(429).json({
        success: false,
        error: {
          message: 'Bot access rate limited',
          statusCode: 429,
          userAgent: userAgent.substring(0, 100) // Truncate for security
        },
        timestamp: new Date().toISOString()
      });
    }
  }
  
  next();
};

// Honeypot middleware
export const honeypotMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const path = req.path.toLowerCase();
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
  
  // Check if accessing honeypot path
  for (const honeypotPath of HONEYPOT_PATHS) {
    if (path.includes(honeypotPath)) {
      addSuspiciousIP(clientIP, `Honeypot Access: ${honeypotPath}`, 'high');
      
      console.warn(`🍯 Honeypot triggered by IP ${clientIP}: ${path}`);
      
      // Return fake 404 to not reveal honeypot
      return res.status(404).json({
        success: false,
        error: {
          message: 'Not Found',
          statusCode: 404
        },
        timestamp: new Date().toISOString()
      });
    }
  }
  
  next();
};

// CSRF protection middleware
export const csrfProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET requests and certain paths
  if (req.method === 'GET' || req.path.startsWith('/api/auth/')) {
    return next();
  }
  
  const sessionId = (req as any).session?.id || req.ip;
  const token = req.get('X-CSRF-Token') || req.body?.csrf_token;
  
  if (!token || !validateCSRFToken(sessionId, token)) {
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
    addSuspiciousIP(clientIP, 'CSRF Attack', 'medium');
    
    console.warn(`🛡️ CSRF attack blocked from IP: ${clientIP}`);
    
    return res.status(403).json({
      success: false,
      error: {
        message: 'CSRF token validation failed',
        statusCode: 403,
        csrfRequired: true
      },
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Behavioral analysis middleware
export const behavioralAnalysisMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || '';
  
  // Analyze request patterns
  const suspiciousIndicators = [];
  
  // Check for missing common headers
  if (!req.get('Accept')) {
    suspiciousIndicators.push('Missing Accept header');
  }
  
  if (!req.get('Accept-Language')) {
    suspiciousIndicators.push('Missing Accept-Language header');
  }
  
  // Check for suspicious user agent patterns
  if (userAgent.length < 10 || userAgent === 'Mozilla/5.0') {
    suspiciousIndicators.push('Suspicious User-Agent');
  }
  
  // Check for rapid sequential requests to different endpoints
  const pathPattern = req.path;
  const existing = ddosTracker.suspiciousPatterns.get(clientIP) || 0;
  ddosTracker.suspiciousPatterns.set(clientIP, existing + 1);
  
  if (existing > 50) { // More than 50 different endpoints accessed
    suspiciousIndicators.push('Scanning behavior detected');
  }
  
  // Check request timing patterns
  const now = Date.now();
  const requestKey = `${clientIP}_timing`;
  const lastRequest = (req as any).app.locals[requestKey] || 0;
  
  if (now - lastRequest < 100) { // Requests less than 100ms apart
    suspiciousIndicators.push('Automated request timing');
  }
  
  (req as any).app.locals[requestKey] = now;
  
  if (suspiciousIndicators.length >= 2) {
    addSuspiciousIP(clientIP, `Behavioral Analysis: ${suspiciousIndicators.join(', ')}`, 'medium');
    console.warn(`🧠 Suspicious behavior detected from ${clientIP}: ${suspiciousIndicators.join(', ')}`);
  }
  
  next();
};

// Enhanced security headers middleware
export const enhancedSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Advanced security headers
  res.setHeader('X-Anti-Hacking-Protection', 'enabled');
  res.setHeader('X-Attack-Detection', 'active');
  res.setHeader('X-DDoS-Protection', 'enabled');
  res.setHeader('X-Bot-Detection', 'active');
  res.setHeader('X-Behavioral-Analysis', 'enabled');
  res.setHeader('X-Honeypot-System', 'active');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

// Admin endpoints for anti-hacking management
export const antiHackingAdmin = {
  // Get security statistics
  getSecurityStats: async (req: Request, res: Response) => {
    try {
      const stats = {
        suspiciousIPs: suspiciousIPs.size,
        blockedIPs: blockedIPs.size,
        attackPatternsDetected: ATTACK_PATTERNS.length,
        honeypotPaths: HONEYPOT_PATHS.size,
        recentSuspiciousActivity: Array.from(suspiciousIPs.entries())
          .sort(([,a], [,b]) => b.lastAttempt.getTime() - a.lastAttempt.getTime())
          .slice(0, 10)
          .map(([ip, activity]) => ({
            ip,
            attempts: activity.attempts,
            lastAttempt: activity.lastAttempt,
            attacks: activity.attacks,
            severity: activity.severity,
            blocked: activity.blocked
          }))
      };
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve security statistics',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // Manually block IP
  blockIP: async (req: Request, res: Response) => {
    try {
      const { ip, reason } = req.body;
      
      if (!ip) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'IP address is required',
            statusCode: 400
          },
          timestamp: new Date().toISOString()
        });
      }
      
      blockedIPs.add(ip);
      addSuspiciousIP(ip, reason || 'Manual block', 'critical');
      
      console.warn(`🚨 IP manually blocked: ${ip} (${reason})`);
      
      res.json({
        success: true,
        data: {
          blockedIP: ip,
          reason: reason || 'Manual block'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to block IP',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // Unblock IP
  unblockIP: async (req: Request, res: Response) => {
    try {
      const { ip } = req.body;
      
      if (!ip) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'IP address is required',
            statusCode: 400
          },
          timestamp: new Date().toISOString()
        });
      }
      
      blockedIPs.delete(ip);
      suspiciousIPs.delete(ip);
      
      console.log(`✅ IP unblocked: ${ip}`);
      
      res.json({
        success: true,
        data: {
          unblockedIP: ip
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to unblock IP',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      });
    }
  }
};

// Clean up old tracking data periodically
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  // Clean old request counts
  for (const [ip, data] of ddosTracker.requestCounts.entries()) {
    if (data.lastReset < oneHourAgo) {
      ddosTracker.requestCounts.delete(ip);
    }
  }
  
  // Clean old suspicious patterns
  if (ddosTracker.suspiciousPatterns.size > 1000) {
    ddosTracker.suspiciousPatterns.clear();
  }
  
  // Clean old suspicious IPs (keep blocked ones)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  for (const [ip, activity] of suspiciousIPs.entries()) {
    if (!activity.blocked && activity.lastAttempt < oneDayAgo) {
      suspiciousIPs.delete(ip);
    }
  }
}, 60 * 60 * 1000); // Every hour

console.log('🛡️ Anti-Hacking Protection System initialized');

export {
  suspiciousIPs,
  blockedIPs,
  ATTACK_PATTERNS,
  HONEYPOT_PATHS
};