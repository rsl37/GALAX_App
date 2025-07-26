/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

// Added 2025-01-13 21:57:30 UTC - Centralized Security Management System
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { antimalwareFileScanner, antimalwarePayloadScanner, getQuarantineStats, manageQuarantine } from './antimalware.js';
import { antivirusFileScanner, realTimeProtection, antivirusAdmin, initializeAntivirus, globalScanStats } from './antivirus.js';
import { 
  ipBlockingMiddleware, 
  attackDetectionMiddleware, 
  ddosProtectionMiddleware,
  botDetectionMiddleware,
  honeypotMiddleware,
  csrfProtectionMiddleware,
  behavioralAnalysisMiddleware,
  enhancedSecurityHeaders,
  antiHackingAdmin,
  generateCSRFToken,
  suspiciousIPs,
  blockedIPs
} from './antihacking.js';

// Security system status
interface SecuritySystemStatus {
  antimalware: {
    enabled: boolean;
    lastScan: string;
    threatsDetected: number;
    quarantinedFiles: number;
  };
  antivirus: {
    enabled: boolean;
    definitionsCount: number;
    lastUpdate: string;
    totalScans: number;
    virusesDetected: number;
  };
  antiHacking: {
    enabled: boolean;
    attackPatternsActive: number;
    suspiciousIPs: number;
    blockedIPs: number;
    ddosProtectionActive: boolean;
    botDetectionActive: boolean;
    honeypotActive: boolean;
  };
  overall: {
    securityLevel: 'low' | 'medium' | 'high' | 'maximum';
    protectionScore: number;
    lastUpdate: string;
  };
}

// Global security configuration
const SECURITY_CONFIG = {
  antimalware: {
    enabled: true,
    scanFiles: true,
    scanPayloads: true,
    quarantineThreats: true
  },
  antivirus: {
    enabled: true,
    realTimeProtection: true,
    autoUpdate: true,
    updateInterval: 4 * 60 * 60 * 1000 // 4 hours
  },
  antiHacking: {
    enabled: true,
    ipBlocking: true,
    attackDetection: true,
    ddosProtection: true,
    botDetection: true,
    honeypot: true,
    csrfProtection: true,
    behavioralAnalysis: true
  }
};

// Security event logging
interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: 'malware' | 'virus' | 'attack' | 'ddos' | 'bot' | 'honeypot' | 'csrf' | 'behavioral';
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip: string;
  userAgent?: string;
  details: any;
  action: string;
  status: 'blocked' | 'quarantined' | 'allowed' | 'monitored';
}

const securityEvents: SecurityEvent[] = [];
const MAX_SECURITY_EVENTS = 1000;

// Log security event
const logSecurityEvent = (event: Omit<SecurityEvent, 'id' | 'timestamp'>) => {
  const securityEvent: SecurityEvent = {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    ...event
  };
  
  securityEvents.unshift(securityEvent);
  
  // Keep only the most recent events
  if (securityEvents.length > MAX_SECURITY_EVENTS) {
    securityEvents.splice(MAX_SECURITY_EVENTS);
  }
  
  // Log critical events immediately
  if (event.severity === 'critical') {
    console.error(`🚨 CRITICAL SECURITY EVENT [${securityEvent.id}]:`, {
      type: event.type,
      ip: event.ip,
      details: event.details,
      action: event.action,
      timestamp: securityEvent.timestamp.toISOString()
    });
  }
};

// Comprehensive security middleware stack
export const comprehensiveSecurityMiddleware = [
  // Enhanced security headers (first)
  enhancedSecurityHeaders,
  
  // Real-time antivirus protection
  realTimeProtection,
  
  // IP blocking (early blocking of known threats)
  ipBlockingMiddleware,
  
  // DDoS protection
  ddosProtectionMiddleware,
  
  // Honeypot detection
  honeypotMiddleware,
  
  // Bot detection
  botDetectionMiddleware,
  
  // Attack pattern detection
  attackDetectionMiddleware,
  
  // Behavioral analysis
  behavioralAnalysisMiddleware,
  
  // Antimalware payload scanning
  antimalwarePayloadScanner,
  
  // CSRF protection (for state-changing requests)
  csrfProtectionMiddleware
];

// File upload security middleware stack
export const fileUploadSecurityMiddleware = [
  // Antimalware file scanning
  antimalwareFileScanner,
  
  // Antivirus file scanning
  antivirusFileScanner
];

// Get comprehensive security status
export const getSecurityStatus = async (): Promise<SecuritySystemStatus> => {
  try {
    // Get antimalware stats
    const malwareStats = await getQuarantineStats();
    
    // Calculate protection score (0-100)
    let protectionScore = 0;
    
    if (SECURITY_CONFIG.antimalware.enabled) protectionScore += 25;
    if (SECURITY_CONFIG.antivirus.enabled) protectionScore += 25;
    if (SECURITY_CONFIG.antiHacking.enabled) protectionScore += 25;
    if (SECURITY_CONFIG.antiHacking.ddosProtection) protectionScore += 5;
    if (SECURITY_CONFIG.antiHacking.botDetection) protectionScore += 5;
    if (SECURITY_CONFIG.antiHacking.honeypot) protectionScore += 5;
    if (SECURITY_CONFIG.antiHacking.behavioralAnalysis) protectionScore += 5;
    if (SECURITY_CONFIG.antiHacking.csrfProtection) protectionScore += 5;
    
    // Determine security level
    let securityLevel: 'low' | 'medium' | 'high' | 'maximum';
    if (protectionScore >= 95) securityLevel = 'maximum';
    else if (protectionScore >= 80) securityLevel = 'high';
    else if (protectionScore >= 60) securityLevel = 'medium';
    else securityLevel = 'low';
    
    return {
      antimalware: {
        enabled: SECURITY_CONFIG.antimalware.enabled,
        lastScan: new Date().toISOString(),
        threatsDetected: malwareStats.recentQuarantine.length,
        quarantinedFiles: malwareStats.totalQuarantined
      },
      antivirus: {
        enabled: SECURITY_CONFIG.antivirus.enabled,
        definitionsCount: 13, // Number of virus signatures
        lastUpdate: globalScanStats.lastUpdate,
        totalScans: globalScanStats.totalScans,
        virusesDetected: globalScanStats.virusesDetected
      },
      antiHacking: {
        enabled: SECURITY_CONFIG.antiHacking.enabled,
        attackPatternsActive: 13, // Number of attack patterns
        suspiciousIPs: suspiciousIPs.size,
        blockedIPs: blockedIPs.size,
        ddosProtectionActive: SECURITY_CONFIG.antiHacking.ddosProtection,
        botDetectionActive: SECURITY_CONFIG.antiHacking.botDetection,
        honeypotActive: SECURITY_CONFIG.antiHacking.honeypot
      },
      overall: {
        securityLevel,
        protectionScore,
        lastUpdate: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error getting security status:', error);
    return {
      antimalware: { enabled: false, lastScan: '', threatsDetected: 0, quarantinedFiles: 0 },
      antivirus: { enabled: false, definitionsCount: 0, lastUpdate: '', totalScans: 0, virusesDetected: 0 },
      antiHacking: { enabled: false, attackPatternsActive: 0, suspiciousIPs: 0, blockedIPs: 0, ddosProtectionActive: false, botDetectionActive: false, honeypotActive: false },
      overall: { securityLevel: 'low', protectionScore: 0, lastUpdate: new Date().toISOString() }
    };
  }
};

// Security dashboard admin endpoints
export const securityDashboardAdmin = {
  // Get overall security status
  getStatus: async (req: Request, res: Response) => {
    try {
      const status = await getSecurityStatus();
      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve security status',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // Get security events
  getEvents: async (req: Request, res: Response) => {
    try {
      const { limit = 50, severity, type } = req.query;
      
      let filteredEvents = securityEvents;
      
      if (severity) {
        filteredEvents = filteredEvents.filter(e => e.severity === severity);
      }
      
      if (type) {
        filteredEvents = filteredEvents.filter(e => e.type === type);
      }
      
      const events = filteredEvents.slice(0, Number(limit));
      
      res.json({
        success: true,
        data: {
          events,
          total: filteredEvents.length,
          filters: { severity, type, limit }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve security events',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // Update security configuration
  updateConfig: async (req: Request, res: Response) => {
    try {
      const { config } = req.body;
      
      if (config.antimalware) {
        Object.assign(SECURITY_CONFIG.antimalware, config.antimalware);
      }
      
      if (config.antivirus) {
        Object.assign(SECURITY_CONFIG.antivirus, config.antivirus);
      }
      
      if (config.antiHacking) {
        Object.assign(SECURITY_CONFIG.antiHacking, config.antiHacking);
      }
      
      console.log('✅ Security configuration updated:', config);
      
      res.json({
        success: true,
        data: {
          config: SECURITY_CONFIG,
          updated: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update security configuration',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // Emergency security lockdown
  emergencyLockdown: async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;
      
      // Enable maximum security
      SECURITY_CONFIG.antimalware.enabled = true;
      SECURITY_CONFIG.antivirus.enabled = true;
      SECURITY_CONFIG.antiHacking.enabled = true;
      SECURITY_CONFIG.antiHacking.ipBlocking = true;
      SECURITY_CONFIG.antiHacking.attackDetection = true;
      SECURITY_CONFIG.antiHacking.ddosProtection = true;
      SECURITY_CONFIG.antiHacking.botDetection = true;
      SECURITY_CONFIG.antiHacking.behavioralAnalysis = true;
      
      logSecurityEvent({
        type: 'attack',
        severity: 'critical',
        ip: req.ip || 'admin',
        details: { reason: reason || 'Emergency lockdown activated' },
        action: 'Emergency lockdown enabled',
        status: 'blocked'
      });
      
      console.error('🚨 EMERGENCY SECURITY LOCKDOWN ACTIVATED:', reason);
      
      res.json({
        success: true,
        data: {
          lockdownActive: true,
          reason: reason || 'Emergency lockdown activated',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to activate emergency lockdown',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // Generate security report
  generateReport: async (req: Request, res: Response) => {
    try {
      const status = await getSecurityStatus();
      const recentEvents = securityEvents.slice(0, 100);
      
      const report = {
        reportId: crypto.randomUUID(),
        generatedAt: new Date().toISOString(),
        securityStatus: status,
        recentEvents: recentEvents.length,
        criticalEvents: recentEvents.filter(e => e.severity === 'critical').length,
        highSeverityEvents: recentEvents.filter(e => e.severity === 'high').length,
        eventsByType: {
          malware: recentEvents.filter(e => e.type === 'malware').length,
          virus: recentEvents.filter(e => e.type === 'virus').length,
          attack: recentEvents.filter(e => e.type === 'attack').length,
          ddos: recentEvents.filter(e => e.type === 'ddos').length,
          bot: recentEvents.filter(e => e.type === 'bot').length,
          honeypot: recentEvents.filter(e => e.type === 'honeypot').length
        },
        recommendations: generateSecurityRecommendations(status),
        configurationStatus: SECURITY_CONFIG
      };
      
      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to generate security report',
          statusCode: 500
        },
        timestamp: new Date().toISOString()
      });
    }
  }
};

// Generate security recommendations based on current status
const generateSecurityRecommendations = (status: SecuritySystemStatus): string[] => {
  const recommendations: string[] = [];
  
  if (status.overall.protectionScore < 80) {
    recommendations.push('Enable all security modules for maximum protection');
  }
  
  if (status.antiHacking.suspiciousIPs > 10) {
    recommendations.push('High number of suspicious IPs detected - consider reviewing and blocking');
  }
  
  if (status.antivirus.virusesDetected > 0) {
    recommendations.push('Viruses detected - review quarantine and update definitions');
  }
  
  if (status.antimalware.quarantinedFiles > 0) {
    recommendations.push('Malware threats quarantined - review and clean old files');
  }
  
  if (!status.antiHacking.ddosProtectionActive) {
    recommendations.push('Enable DDoS protection for better resilience');
  }
  
  // Note: Behavioral analysis is part of the anti-hacking system
  if (!SECURITY_CONFIG.antiHacking.behavioralAnalysis) {
    recommendations.push('Enable behavioral analysis for advanced threat detection');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Security configuration is optimal');
  }
  
  return recommendations;
};

// Initialize all security systems
export const initializeSecuritySystems = () => {
  console.log('🛡️ Initializing Comprehensive Security Protection...');
  
  // Initialize antivirus system
  initializeAntivirus();
  
  console.log('✅ Security Systems Status:');
  console.log(`   🦠 Antimalware Protection: ${SECURITY_CONFIG.antimalware.enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   🔍 Antivirus Protection: ${SECURITY_CONFIG.antivirus.enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   🛡️ Anti-Hacking Protection: ${SECURITY_CONFIG.antiHacking.enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   🚫 DDoS Protection: ${SECURITY_CONFIG.antiHacking.ddosProtection ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   🤖 Bot Detection: ${SECURITY_CONFIG.antiHacking.botDetection ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   🍯 Honeypot System: ${SECURITY_CONFIG.antiHacking.honeypot ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   🧠 Behavioral Analysis: ${SECURITY_CONFIG.antiHacking.behavioralAnalysis ? 'ENABLED' : 'DISABLED'}`);
  
  console.log('🚀 GALAX App Security Systems are FULLY OPERATIONAL');
};

// Export all admin endpoints
export const securityAdminEndpoints = {
  dashboard: securityDashboardAdmin,
  antimalware: manageQuarantine,
  antivirus: antivirusAdmin,
  antiHacking: antiHackingAdmin
};

// Export security configuration for external use
export { SECURITY_CONFIG, securityEvents, logSecurityEvent, generateCSRFToken };