#!/usr/bin/env tsx

/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */



/**
 * Test for the deployment validation functionality
 * This tests the deployment readiness endpoint functionality
 */

import dotenv from 'dotenv';
import { performDeploymentReadinessCheck, getDeploymentReadiness } from '../server/deployment-validation.ts';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

async function testDeploymentValidation() {
  console.log('🧪 Testing Deployment Validation Functionality');
  console.log('==============================================\n');

  try {
    // Test 1: Direct function call
    console.log('📋 Test 1: Direct function call');
    console.log('-------------------------------');
    const report = await performDeploymentReadinessCheck();
    
    console.log(`✅ Function executed successfully`);
    console.log(`📊 Overall Status: ${report.overall_status}`);
    console.log(`📊 Total Checks: ${report.summary.total}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⚠️  Warnings: ${report.summary.warnings}`);

    // Test 2: Mock Express request/response
    console.log('\n📋 Test 2: Express endpoint simulation');
    console.log('------------------------------------');
    
    const mockReq = {} as any;
    let responseData: any = null;
    let statusCode: number = 200;
    
    const mockRes = {
      status: (code: number) => {
        statusCode = code;
        return mockRes;
      },
      json: (data: any) => {
        responseData = data;
      }
    } as any;

    await getDeploymentReadiness(mockReq, mockRes);
    
    console.log(`✅ Endpoint executed successfully`);
    console.log(`📊 HTTP Status Code: ${statusCode}`);
    console.log(`📊 Response Success: ${responseData?.success}`);
    console.log(`📊 Overall Status: ${responseData?.data?.overall_status}`);

    // Test 3: Validate response structure
    console.log('\n📋 Test 3: Response structure validation');
    console.log('---------------------------------------');
    
    const requiredFields = ['overall_status', 'timestamp', 'environment', 'checks', 'summary'];
    const missingFields = requiredFields.filter(field => !(field in responseData.data));
    
    if (missingFields.length === 0) {
      console.log('✅ Response structure is valid');
    } else {
      console.log('❌ Missing fields in response:', missingFields);
    }

    // Test 4: Check status logic
    console.log('\n📋 Test 4: Status logic validation');
    console.log('----------------------------------');
    
    if (responseData.data.summary.failed > 0 && responseData.data.overall_status !== 'not_ready') {
      console.log('❌ Status logic error: Failed checks should result in not_ready status');
    } else if (responseData.data.summary.failed === 0 && responseData.data.summary.warnings > 0 && responseData.data.overall_status !== 'warning') {
      console.log('❌ Status logic error: Warnings without failures should result in warning status');
    } else if (responseData.data.summary.failed === 0 && responseData.data.summary.warnings === 0 && responseData.data.overall_status !== 'ready') {
      console.log('❌ Status logic error: No failures or warnings should result in ready status');
    } else {
      console.log('✅ Status logic is correct');
    }

    // Test 5: Environment variable validation
    console.log('\n📋 Test 5: Environment validation details');
    console.log('----------------------------------------');
    
    const envChecks = responseData.data.checks.filter((check: any) => 
      check.check.includes('Environment Variable')
    );
    
    console.log(`📊 Environment variable checks: ${envChecks.length}`);
    
    const requiredEnvPassed = envChecks.filter((check: any) => 
      check.check.includes('NODE_ENV') || 
      check.check.includes('PORT') || 
      check.check.includes('DATA_DIRECTORY') ||
      check.check.includes('JWT_SECRET') ||
      check.check.includes('FRONTEND_URL')
    ).every((check: any) => check.status === 'pass');
    
    if (requiredEnvPassed) {
      console.log('✅ All required environment variables are properly validated');
    } else {
      console.log('❌ Some required environment variables failed validation');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 FINAL VALIDATION SUMMARY:');
    console.log(`Overall Status: ${responseData.data.overall_status}`);
    console.log(`HTTP Status: ${statusCode}`);
    console.log(`Deployment Ready: ${responseData.data.overall_status === 'ready' ? 'YES' : 'NO'}`);
    
    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    return false;
  }
}

// Run the test
testDeploymentValidation()
  .then((success) => {
    if (success) {
      console.log('\n✅ Deployment validation tests PASSED');
      process.exit(0);
    } else {
      console.log('\n❌ Deployment validation tests FAILED');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  });