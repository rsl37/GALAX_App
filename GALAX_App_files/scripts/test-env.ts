#!/usr/bin/env node

/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */



/**
 * Environment Variables Test Script
 * 
 * This script tests the environment variable configuration
 * for the GALAX Civic Networking App
 */

import dotenv from 'dotenv';

// Load environment variables from .env file if it exists
dotenv.config();

console.log('🧪 Testing Environment Variables Configuration\n');

const requiredVars = [
  'NODE_ENV',
  'PORT', 
  'JWT_SECRET'
];

const recommendedVars = [
  'CLIENT_ORIGIN',
  'DATABASE_URL',
  'SOCKET_PATH'
];

const optionalVars = [
  'SMTP_HOST',
  'SMTP_PORT',
  'TWILIO_SID'
];

console.log('📋 Required Environment Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const displayValue = varName === 'JWT_SECRET' ? (value ? '[HIDDEN]' : 'NOT SET') : (value || 'NOT SET');
  console.log(`   ${status} ${varName}: ${displayValue}`);
});

console.log('\n📋 Recommended Environment Variables:');
recommendedVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '⚠️';
  const displayValue = value || 'NOT SET';
  console.log(`   ${status} ${varName}: ${displayValue}`);
});

console.log('\n📋 Optional Environment Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '➖';
  const displayValue = value || 'NOT SET';
  console.log(`   ${status} ${varName}: ${displayValue}`);
});

// Test specific validations
console.log('\n🔍 Environment Variable Validations:');

// NODE_ENV validation
const nodeEnv = process.env.NODE_ENV;
if (nodeEnv && ['development', 'production', 'staging', 'test'].includes(nodeEnv)) {
  console.log(`   ✅ NODE_ENV: Valid value "${nodeEnv}"`);
} else {
  console.log(`   ❌ NODE_ENV: Invalid or missing (current: "${nodeEnv || 'NOT SET'}")`);
}

// JWT_SECRET validation
const jwtSecret = process.env.JWT_SECRET;
if (jwtSecret) {
  if (jwtSecret.length >= 32) {
    console.log(`   ✅ JWT_SECRET: Valid length (${jwtSecret.length} characters)`);
  } else {
    console.log(`   ❌ JWT_SECRET: Too short (${jwtSecret.length} characters, minimum 32 required)`);
  }
} else {
  console.log(`   ❌ JWT_SECRET: Not set`);
}

// CLIENT_ORIGIN validation
const clientOrigin = process.env.CLIENT_ORIGIN;
if (clientOrigin) {
  try {
    const url = new URL(clientOrigin);
    const isSecure = url.protocol === 'https:' || (nodeEnv !== 'production' && url.protocol === 'http:');
    if (isSecure) {
      console.log(`   ✅ CLIENT_ORIGIN: Valid URL with ${url.protocol} protocol`);
    } else {
      console.log(`   ⚠️ CLIENT_ORIGIN: Should use HTTPS in production (current: ${url.protocol})`);
    }
  } catch (error) {
    console.log(`   ❌ CLIENT_ORIGIN: Invalid URL format`);
  }
} else {
  console.log(`   ⚠️ CLIENT_ORIGIN: Not set (CORS may use fallback origins)`);
}

// DATABASE_URL validation
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    if (url.protocol === 'postgres:' || url.protocol === 'postgresql:') {
      console.log(`   ✅ DATABASE_URL: Valid PostgreSQL URL`);
    } else {
      console.log(`   ⚠️ DATABASE_URL: Unexpected protocol ${url.protocol} (expected postgres: or postgresql:)`);
    }
  } catch (error) {
    console.log(`   ❌ DATABASE_URL: Invalid URL format`);
  }
} else {
  console.log(`   ➖ DATABASE_URL: Not set (will use SQLite fallback)`);
}

// SOCKET_PATH validation
const socketPath = process.env.SOCKET_PATH;
if (socketPath) {
  if (socketPath.startsWith('/') && socketPath.length > 1) {
    console.log(`   ✅ SOCKET_PATH: Valid path "${socketPath}"`);
  } else {
    console.log(`   ⚠️ SOCKET_PATH: Should start with / and have additional components (current: "${socketPath}")`);
  }
} else {
  console.log(`   ➖ SOCKET_PATH: Not set (will use default /socket.io)`);
}

console.log('\n📋 Summary:');
const totalRequired = requiredVars.length;
const setRequired = requiredVars.filter(v => process.env[v]).length;
const totalRecommended = recommendedVars.length;
const setRecommended = recommendedVars.filter(v => process.env[v]).length;

console.log(`   Required Variables: ${setRequired}/${totalRequired} set`);
console.log(`   Recommended Variables: ${setRecommended}/${totalRecommended} set`);

if (setRequired === totalRequired) {
  console.log('\n✅ All required environment variables are configured!');
} else {
  console.log('\n❌ Some required environment variables are missing.');
}

if (setRecommended === totalRecommended) {
  console.log('✅ All recommended environment variables are configured!');
} else {
  console.log(`⚠️ ${totalRecommended - setRecommended} recommended environment variables are missing.`);
}

console.log('\n💡 To configure missing variables:');
console.log('   1. Copy .env.example to .env');
console.log('   2. Edit .env with your values');
console.log('   3. Restart the application');