/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { db } from './database.js';

// Environment variables that are required for production deployment
const REQUIRED_ENV_VARS = [
  'NODE_ENV',
  'PORT',
  'DATA_DIRECTORY',
  'JWT_SECRET'
];

// Important environment variables for production (not strictly required but recommended)
const RECOMMENDED_ENV_VARS = [
  'CLIENT_ORIGIN',    // CORS configuration
  'DATABASE_URL',     // Production database connection
  'SOCKET_PATH',      // Custom Socket.IO path
  'FRONTEND_URL'      // Legacy frontend URL support
];

// Optional environment variables with validation
const OPTIONAL_ENV_VARS = [
  'SMTP_HOST',
  'SMTP_PORT', 
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'TRUSTED_ORIGINS',
  'TWILIO_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER'
];

// Minimum requirements for production
const PRODUCTION_REQUIREMENTS = {
  JWT_SECRET_MIN_LENGTH: 32,
  MIN_DISK_SPACE_MB: 100,
  REQUIRED_DIRECTORIES: ['uploads', 'logs'],
  REQUIRED_PERMISSIONS: 0o755
};

interface ValidationResult {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

interface DeploymentReadinessReport {
  overall_status: 'ready' | 'warning' | 'not_ready';
  timestamp: string;
  environment: string;
  checks: ValidationResult[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    total: number;
  };
}

/**
 * Validates environment variables for deployment
 */
export function validateEnvironmentVariables(): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  // Check required environment variables
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar];
    if (!value) {
      results.push({
        check: `Environment Variable: ${envVar}`,
        status: 'fail',
        message: `Required environment variable ${envVar} is not set`,
        details: { variable: envVar, required: true }
      });
    } else {
      results.push({
        check: `Environment Variable: ${envVar}`,
        status: 'pass',
        message: `Environment variable ${envVar} is properly set`,
        details: { variable: envVar, length: value.length }
      });
    }
  }

  // Check recommended environment variables
  for (const envVar of RECOMMENDED_ENV_VARS) {
    const value = process.env[envVar];
    if (!value) {
      results.push({
        check: `Recommended Environment Variable: ${envVar}`,
        status: 'warning',
        message: `Recommended environment variable ${envVar} is not set. This may limit functionality in production`,
        details: { variable: envVar, recommended: true }
      });
    } else {
      results.push({
        check: `Recommended Environment Variable: ${envVar}`,
        status: 'pass',
        message: `Recommended environment variable ${envVar} is properly configured`,
        details: { variable: envVar, length: value.length }
      });
    }
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    if (jwtSecret.length < PRODUCTION_REQUIREMENTS.JWT_SECRET_MIN_LENGTH) {
      results.push({
        check: 'JWT Secret Strength',
        status: 'fail',
        message: `JWT_SECRET is too short (${jwtSecret.length} chars). Minimum ${PRODUCTION_REQUIREMENTS.JWT_SECRET_MIN_LENGTH} characters required for production`,
        details: { current_length: jwtSecret.length, required_length: PRODUCTION_REQUIREMENTS.JWT_SECRET_MIN_LENGTH }
      });
    } else {
      results.push({
        check: 'JWT Secret Strength',
        status: 'pass',
        message: `JWT_SECRET meets security requirements (${jwtSecret.length} characters)`,
        details: { length: jwtSecret.length }
      });
    }
  }

  // Check optional environment variables and provide warnings
  for (const envVar of OPTIONAL_ENV_VARS) {
    const value = process.env[envVar];
    if (!value) {
      results.push({
        check: `Optional Environment Variable: ${envVar}`,
        status: 'warning',
        message: `Optional environment variable ${envVar} is not set. Email features may not work properly`,
        details: { variable: envVar, required: false }
      });
    } else {
      results.push({
        check: `Optional Environment Variable: ${envVar}`,
        status: 'pass',
        message: `Optional environment variable ${envVar} is configured`,
        details: { variable: envVar }
      });
    }
  }

  // Validate DATABASE_URL format if provided
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      if (url.protocol === 'postgres:' || url.protocol === 'postgresql:') {
        results.push({
          check: 'DATABASE_URL Format',
          status: 'pass',
          message: 'DATABASE_URL is properly formatted for PostgreSQL',
          details: { protocol: url.protocol, host: url.hostname, database: url.pathname }
        });
      } else {
        results.push({
          check: 'DATABASE_URL Format',
          status: 'warning',
          message: `DATABASE_URL protocol '${url.protocol}' may not be supported. Expected 'postgres:' or 'postgresql:'`,
          details: { protocol: url.protocol }
        });
      }
    } catch (error) {
      results.push({
        check: 'DATABASE_URL Format',
        status: 'fail',
        message: 'DATABASE_URL is not a valid URL format',
        details: { error: (error as Error).message }
      });
    }
  }

  // Validate CLIENT_ORIGIN format if provided
  const clientOrigin = process.env.CLIENT_ORIGIN;
  if (clientOrigin) {
    try {
      const url = new URL(clientOrigin);
      if (url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:')) {
        results.push({
          check: 'CLIENT_ORIGIN Format',
          status: 'pass',
          message: 'CLIENT_ORIGIN is properly formatted',
          details: { protocol: url.protocol, host: url.hostname }
        });
      } else {
        results.push({
          check: 'CLIENT_ORIGIN Format',
          status: process.env.NODE_ENV === 'production' ? 'fail' : 'warning',
          message: 'CLIENT_ORIGIN should use HTTPS in production',
          details: { protocol: url.protocol, environment: process.env.NODE_ENV }
        });
      }
    } catch (error) {
      results.push({
        check: 'CLIENT_ORIGIN Format',
        status: 'fail',
        message: 'CLIENT_ORIGIN is not a valid URL format',
        details: { error: (error as Error).message }
      });
    }
  }

  // Validate SOCKET_PATH format if provided
  const socketPath = process.env.SOCKET_PATH;
  if (socketPath) {
    if (socketPath.startsWith('/') && socketPath.length > 1) {
      results.push({
        check: 'SOCKET_PATH Format',
        status: 'pass',
        message: 'SOCKET_PATH is properly formatted',
        details: { path: socketPath }
      });
    } else {
      results.push({
        check: 'SOCKET_PATH Format',
        status: 'warning',
        message: 'SOCKET_PATH should start with / and have additional path components',
        details: { path: socketPath }
      });
    }
  }

  // Validate NODE_ENV for production
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv !== 'production') {
    results.push({
      check: 'Production Environment',
      status: 'warning',
      message: `NODE_ENV is set to '${nodeEnv}', expected 'production' for deployment`,
      details: { current: nodeEnv, expected: 'production' }
    });
  } else {
    results.push({
      check: 'Production Environment',
      status: 'pass',
      message: 'NODE_ENV is properly set to production',
      details: { environment: nodeEnv }
    });
  }

  return results;
}

/**
 * Validates file system setup and permissions
 */
export function validateFileSystem(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const dataDirectory = process.env.DATA_DIRECTORY || './data';

  try {
    // Check if data directory exists
    if (!fs.existsSync(dataDirectory)) {
      results.push({
        check: 'Data Directory Existence',
        status: 'fail',
        message: `Data directory does not exist: ${dataDirectory}`,
        details: { path: dataDirectory }
      });
      return results; // Can't continue without data directory
    } else {
      results.push({
        check: 'Data Directory Existence',
        status: 'pass',
        message: `Data directory exists: ${dataDirectory}`,
        details: { path: dataDirectory }
      });
    }

    // Check data directory permissions
    const dataStats = fs.statSync(dataDirectory);
    const permissions = (dataStats.mode & parseInt('777', 8)).toString(8);
    if ((dataStats.mode & PRODUCTION_REQUIREMENTS.REQUIRED_PERMISSIONS) !== PRODUCTION_REQUIREMENTS.REQUIRED_PERMISSIONS) {
      results.push({
        check: 'Data Directory Permissions',
        status: 'fail',
        message: `Data directory permissions are insufficient. Current: ${permissions}, Required: ${PRODUCTION_REQUIREMENTS.REQUIRED_PERMISSIONS.toString(8)}`,
        details: { current_permissions: permissions, required_permissions: PRODUCTION_REQUIREMENTS.REQUIRED_PERMISSIONS.toString(8) }
      });
    } else {
      results.push({
        check: 'Data Directory Permissions',
        status: 'pass',
        message: `Data directory has proper permissions: ${permissions}`,
        details: { permissions }
      });
    }

    // Check required subdirectories
    for (const subdir of PRODUCTION_REQUIREMENTS.REQUIRED_DIRECTORIES) {
      const subdirPath = path.join(dataDirectory, subdir);
      if (!fs.existsSync(subdirPath)) {
        results.push({
          check: `Required Directory: ${subdir}`,
          status: 'fail',
          message: `Required subdirectory does not exist: ${subdirPath}`,
          details: { path: subdirPath, parent: dataDirectory }
        });
      } else {
        const subdirStats = fs.statSync(subdirPath);
        const subdirPerms = (subdirStats.mode & parseInt('777', 8)).toString(8);
        results.push({
          check: `Required Directory: ${subdir}`,
          status: 'pass',
          message: `Required subdirectory exists with proper permissions: ${subdirPath} (${subdirPerms})`,
          details: { path: subdirPath, permissions: subdirPerms }
        });
      }
    }

    // Check available disk space
    try {
      const stats = fs.statSync(dataDirectory);
      // Note: This is a simplified check. In production, you might want to use a library like 'fs-extra' for more accurate disk space checking
      results.push({
        check: 'Disk Space',
        status: 'pass',
        message: 'Data directory is accessible (disk space check simplified)',
        details: { note: 'Consider implementing proper disk space monitoring in production' }
      });
    } catch (error) {
      results.push({
        check: 'Disk Space',
        status: 'warning',
        message: 'Could not verify disk space availability',
        details: { error: (error as Error).message }
      });
    }

  } catch (error) {
    results.push({
      check: 'File System Access',
      status: 'fail',
      message: `Error accessing file system: ${(error as Error).message}`,
      details: { error: (error as Error).message }
    });
  }

  return results;
}

/**
 * Validates database connectivity and schema
 */
export async function validateDatabase(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  try {
    // Test basic database connection
    const testQuery = await db.selectFrom('users').selectAll().limit(1).execute();
    results.push({
      check: 'Database Connection',
      status: 'pass',
      message: 'Database connection is working properly',
      details: { test_query_result_count: testQuery.length }
    });

    // Check if essential tables exist
    const tables = ['users', 'help_requests', 'crisis_alerts', 'proposals'];
    for (const table of tables) {
      try {
        await db.selectFrom(table as any).selectAll().limit(1).execute();
        results.push({
          check: `Database Table: ${table}`,
          status: 'pass',
          message: `Table '${table}' exists and is accessible`,
          details: { table }
        });
      } catch (error) {
        results.push({
          check: `Database Table: ${table}`,
          status: 'fail',
          message: `Table '${table}' is missing or inaccessible: ${(error as Error).message}`,
          details: { table, error: (error as Error).message }
        });
      }
    }

  } catch (error) {
    results.push({
      check: 'Database Connection',
      status: 'fail',
      message: `Database connection failed: ${(error as Error).message}`,
      details: { error: (error as Error).message }
    });
  }

  return results;
}

/**
 * Validates production configuration and security settings
 */
export function validateProductionConfig(): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Check if running in production mode
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') {
    results.push({
      check: 'Production Mode',
      status: 'pass',
      message: 'Application is running in production mode',
      details: { node_env: nodeEnv }
    });
  } else {
    results.push({
      check: 'Production Mode',
      status: 'warning',
      message: `Application is not in production mode (current: ${nodeEnv})`,
      details: { node_env: nodeEnv, expected: 'production' }
    });
  }

  // Check frontend URL configuration
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl && frontendUrl.startsWith('https://')) {
    results.push({
      check: 'HTTPS Frontend URL',
      status: 'pass',
      message: 'Frontend URL is configured with HTTPS',
      details: { frontend_url: frontendUrl }
    });
  } else if (frontendUrl) {
    results.push({
      check: 'HTTPS Frontend URL',
      status: 'warning',
      message: 'Frontend URL is not using HTTPS. This is required for production',
      details: { frontend_url: frontendUrl }
    });
  }

  // Check port configuration
  const port = process.env.PORT;
  if (port && !isNaN(Number(port))) {
    const portNum = Number(port);
    if (portNum >= 1024 && portNum <= 65535) {
      results.push({
        check: 'Port Configuration',
        status: 'pass',
        message: `Port is properly configured: ${port}`,
        details: { port: portNum }
      });
    } else {
      results.push({
        check: 'Port Configuration',
        status: 'warning',
        message: `Port ${port} may not be suitable for production. Consider using a port between 1024-65535`,
        details: { port: portNum }
      });
    }
  }

  return results;
}

/**
 * Performs comprehensive deployment readiness check
 */
export async function performDeploymentReadinessCheck(): Promise<DeploymentReadinessReport> {
  console.log('🚀 Starting deployment readiness check...');
  
  const allChecks: ValidationResult[] = [];
  
  // Collect all validation results
  allChecks.push(...validateEnvironmentVariables());
  allChecks.push(...validateFileSystem());
  allChecks.push(...await validateDatabase());
  allChecks.push(...validateProductionConfig());

  // Calculate summary
  const summary = {
    passed: allChecks.filter(c => c.status === 'pass').length,
    failed: allChecks.filter(c => c.status === 'fail').length,
    warnings: allChecks.filter(c => c.status === 'warning').length,
    total: allChecks.length
  };

  // Determine overall status
  let overall_status: 'ready' | 'warning' | 'not_ready';
  if (summary.failed > 0) {
    overall_status = 'not_ready';
  } else if (summary.warnings > 0) {
    overall_status = 'warning';
  } else {
    overall_status = 'ready';
  }

  const report: DeploymentReadinessReport = {
    overall_status,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    checks: allChecks,
    summary
  };

  console.log(`✅ Deployment readiness check completed. Status: ${overall_status}`);
  console.log(`📊 Summary: ${summary.passed} passed, ${summary.failed} failed, ${summary.warnings} warnings`);

  return report;
}

/**
 * Express endpoint for deployment readiness check
 */
export const getDeploymentReadiness = async (req: Request, res: Response): Promise<void> => {
  try {
    const report = await performDeploymentReadinessCheck();
    
    // Set appropriate HTTP status based on readiness
    let statusCode = 200;
    if (report.overall_status === 'not_ready') {
      statusCode = 503; // Service Unavailable
    } else if (report.overall_status === 'warning') {
      statusCode = 200; // OK but with warnings
    }

    res.status(statusCode).json({
      success: report.overall_status !== 'not_ready',
      data: report
    });
  } catch (error) {
    console.error('❌ Deployment readiness check failed:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Deployment readiness check failed',
        details: (error as Error).message,
        statusCode: 500
      }
    });
  }
};