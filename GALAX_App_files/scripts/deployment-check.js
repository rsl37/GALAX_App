#!/usr/bin/env tsx

/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */



/**
 * GALAX Deployment Readiness Check Script
 * 
 * This script performs comprehensive validation of deployment prerequisites
 * and can be run before attempting to deploy the GALAX application.
 * 
 * Usage:
 *   npm run deployment:check
 *   tsx scripts/deployment-check.js
 */

import dotenv from 'dotenv';
import { performDeploymentReadinessCheck } from '../server/deployment-validation.ts';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

/**
 * Main deployment check function
 */
async function runDeploymentCheck() {
  console.log('🚀 GALAX Deployment Readiness Check');
  console.log('=====================================\n');
  
  try {
    const report = await performDeploymentReadinessCheck();
    
    // Print summary
    console.log(`\n📊 DEPLOYMENT READINESS SUMMARY`);
    console.log(`==============================`);
    console.log(`Overall Status: ${getStatusEmoji(report.overall_status)} ${report.overall_status.toUpperCase()}`);
    console.log(`Environment: ${report.environment}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`\nChecks Summary:`);
    console.log(`  ✅ Passed: ${report.summary.passed}`);
    console.log(`  ❌ Failed: ${report.summary.failed}`);
    console.log(`  ⚠️  Warnings: ${report.summary.warnings}`);
    console.log(`  📊 Total: ${report.summary.total}`);
    
    // Print detailed results
    console.log(`\n📋 DETAILED CHECK RESULTS`);
    console.log(`=========================`);
    
    for (const check of report.checks) {
      const emoji = getCheckEmoji(check.status);
      console.log(`\n${emoji} ${check.check}`);
      console.log(`   Status: ${check.status.toUpperCase()}`);
      console.log(`   Message: ${check.message}`);
      
      if (check.details && Object.keys(check.details).length > 0) {
        console.log(`   Details:`, check.details);
      }
    }
    
    // Print recommendations
    console.log(`\n💡 RECOMMENDATIONS`);
    console.log(`==================`);
    
    if (report.overall_status === 'ready') {
      console.log('✅ Your application is ready for deployment!');
      console.log('   You can proceed with the deployment process.');
    } else if (report.overall_status === 'warning') {
      console.log('⚠️  Your application is mostly ready for deployment.');
      console.log('   Please address the warnings below for optimal production setup:');
      
      const warnings = report.checks.filter(c => c.status === 'warning');
      warnings.forEach(warning => {
        console.log(`   - ${warning.check}: ${warning.message}`);
      });
    } else {
      console.log('❌ Your application is NOT ready for deployment.');
      console.log('   Please fix the following critical issues:');
      
      const failures = report.checks.filter(c => c.status === 'fail');
      failures.forEach(failure => {
        console.log(`   - ${failure.check}: ${failure.message}`);
      });
    }
    
    // Exit with appropriate code
    if (report.overall_status === 'not_ready') {
      console.log('\n❌ Deployment readiness check FAILED');
      process.exit(1);
    } else if (report.overall_status === 'warning') {
      console.log('\n⚠️  Deployment readiness check completed with WARNINGS');
      process.exit(0);
    } else {
      console.log('\n✅ Deployment readiness check PASSED');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n❌ Deployment readiness check failed to run:');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Get emoji for overall status
 */
function getStatusEmoji(status) {
  switch (status) {
    case 'ready': return '✅';
    case 'warning': return '⚠️';
    case 'not_ready': return '❌';
    default: return '❓';
  }
}

/**
 * Get emoji for individual check status
 */
function getCheckEmoji(status) {
  switch (status) {
    case 'pass': return '✅';
    case 'warning': return '⚠️';
    case 'fail': return '❌';
    default: return '❓';
  }
}

/**
 * Display help information
 */
function displayHelp() {
  console.log(`
🚀 GALAX Deployment Readiness Check Script

This script validates that your environment is properly configured for deployment.

Usage:
  npm run deployment:check
  node scripts/deployment-check.js
  ./scripts/deployment-check.js

Options:
  --help, -h    Display this help message

Environment Variables:
  The script reads from .env file in the root directory.
  
  Required variables:
    NODE_ENV, PORT, DATA_DIRECTORY, JWT_SECRET, FRONTEND_URL
  
  Optional variables:
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM

Example .env file:
  NODE_ENV=production
  PORT=3001
  DATA_DIRECTORY=/opt/galax/data
  JWT_SECRET=your-super-secure-jwt-secret-key-here
  FRONTEND_URL=https://galaxcivicnetwork.me
  # Both domains supported: galaxcivicnetwork.me and galax-civic-networking.vercel.app
  TRUSTED_ORIGINS=https://galaxcivicnetwork.me,https://galax-civic-networking.vercel.app
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your-email@gmail.com
  SMTP_PASS=your-app-password
  SMTP_FROM=GALAX Support <noreply@galaxcivicnetwork.me>

For more information, see the deployment guide:
  docs/BETA_DEPLOYMENT_GUIDE.md
`);
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  displayHelp();
  process.exit(0);
}

// Run the deployment check
runDeploymentCheck();