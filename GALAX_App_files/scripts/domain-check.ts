#!/usr/bin/env tsx

/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */



/**
 * Domain & SSL Configuration Checker
 * Validates domain configuration and SSL certificate status
 */

import { execSync } from 'child_process';
import https from 'https';
import { URL } from 'url';
import tls from 'tls';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

interface DomainCheckResult {
  domain: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

class DomainChecker {
  async checkDomain(domain: string): Promise<DomainCheckResult> {
    console.log(`🔍 Checking domain: ${domain}`);
    
    try {
      // Check DNS resolution
      const dnsResult = await this.checkDNS(domain);
      if (dnsResult.status === 'error') {
        return dnsResult;
      }

      // Check HTTPS connectivity
      const httpsResult = await this.checkHTTPS(domain);
      if (httpsResult.status === 'error') {
        return httpsResult;
      }

      // Check SSL certificate
      const sslResult = await this.checkSSL(domain);
      
      return sslResult;
    } catch (error) {
      return {
        domain,
        status: 'error',
        message: 'Domain check failed',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkDNS(domain: string): Promise<DomainCheckResult> {
    try {
      const result = execSync(`dig +short ${domain} A`, { encoding: 'utf8' });
      const ips = result.trim().split('\n').filter(ip => ip);
      
      if (ips.length === 0) {
        return {
          domain,
          status: 'error',
          message: 'DNS resolution failed - no A records found',
          details: 'Check your DNS configuration in your domain provider'
        };
      }

      // Check if pointing to Vercel (common Vercel IPs)
      const vercelIPs = ['76.76.19.61', '76.76.21.61', '76.76.21.98', '76.76.19.98'];
      const pointsToVercel = ips.some(ip => vercelIPs.includes(ip.trim()));
      
      if (!pointsToVercel) {
        return {
          domain,
          status: 'warning',
          message: 'DNS may not be pointing to Vercel',
          details: `Current IPs: ${ips.join(', ')}. Expected Vercel IPs: ${vercelIPs.join(', ')}`
        };
      }

      return {
        domain,
        status: 'success',
        message: 'DNS resolution successful',
        details: `Resolved to: ${ips.join(', ')}`
      };
    } catch (error) {
      return {
        domain,
        status: 'error',
        message: 'DNS check failed',
        details: `dig command failed: ${error}`
      };
    }
  }

  private async checkHTTPS(domain: string): Promise<DomainCheckResult> {
    return new Promise((resolve) => {
      const options = {
        hostname: domain,
        port: 443,
        path: '/',
        method: 'HEAD',
        timeout: 10000,
        rejectUnauthorized: false // We'll check cert separately
      };

      const req = https.request(options, (res) => {
        resolve({
          domain,
          status: 'success',
          message: 'HTTPS connection successful',
          details: `Status: ${res.statusCode}`
        });
      });

      req.on('error', (error) => {
        if (error.message.includes('ECONNREFUSED')) {
          resolve({
            domain,
            status: 'error',
            message: 'HTTPS connection refused',
            details: 'Port 443 is not accessible. Check if SSL is properly configured.'
          });
        } else if (error.message.includes('ENOTFOUND')) {
          resolve({
            domain,
            status: 'error',
            message: 'Domain not found',
            details: 'DNS resolution failed or domain does not exist'
          });
        } else {
          resolve({
            domain,
            status: 'error',
            message: 'HTTPS connection failed',
            details: error.message
          });
        }
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          domain,
          status: 'error',
          message: 'HTTPS connection timeout',
          details: 'Connection timed out after 10 seconds'
        });
      });

      req.end();
    });
  }

  private async checkSSL(domain: string): Promise<DomainCheckResult> {
    return new Promise((resolve) => {
      const options = {
        host: domain,
        port: 443,
        servername: domain,
        rejectUnauthorized: true
      };

      const socket = tls.connect(options, () => {
        const cert = socket.getPeerCertificate();
        socket.end();

        if (cert && cert.subject) {
          const expiryDate = new Date(cert.valid_to);
          const now = new Date();
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilExpiry < 0) {
            resolve({
              domain,
              status: 'error',
              message: 'SSL certificate expired',
              details: `Certificate expired on ${cert.valid_to}`
            });
          } else if (daysUntilExpiry < 30) {
            resolve({
              domain,
              status: 'warning',
              message: 'SSL certificate expires soon',
              details: `Certificate expires in ${daysUntilExpiry} days (${cert.valid_to})`
            });
          } else {
            resolve({
              domain,
              status: 'success',
              message: 'SSL certificate valid',
              details: `Issued by: ${cert.issuer.CN}, Expires: ${cert.valid_to} (${daysUntilExpiry} days)`
            });
          }
        } else {
          resolve({
            domain,
            status: 'error',
            message: 'SSL certificate information not available',
            details: 'Could not retrieve certificate details'
          });
        }
      });

      socket.on('error', (error: Error) => {
        if (error.message.includes('certificate')) {
          resolve({
            domain,
            status: 'error',
            message: 'SSL certificate error',
            details: error.message
          });
        } else {
          resolve({
            domain,
            status: 'error',
            message: 'SSL connection failed',
            details: error.message
          });
        }
      });
    });
  }

  private formatResult(result: DomainCheckResult): string {
    const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    let output = `${icon} ${result.domain}: ${result.message}`;
    
    if (result.details) {
      output += `\n   Details: ${result.details}`;
    }
    
    return output;
  }

  async runCheck(): Promise<void> {
    console.log('🌐 GALAX Domain & SSL Configuration Check\n');

    const domains = [
      'galaxcivicnetwork.me',
      'galax-civic-networking-app.vercel.app'
    ];

    const results: DomainCheckResult[] = [];

    for (const domain of domains) {
      const result = await this.checkDomain(domain);
      results.push(result);
      console.log(this.formatResult(result));
      console.log('');
    }

    // Summary
    console.log('📊 Summary:');
    const successCount = results.filter(r => r.status === 'success').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ⚠️  Warnings: ${warningCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (errorCount > 0) {
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Check DNS configuration in your domain provider');
      console.log('   2. Verify domain is added in Vercel dashboard');
      console.log('   3. Wait for SSL certificate issuance (can take 5-30 minutes)');
      console.log('   4. See GALAX_App_files/docs/VERCEL_DOMAIN_SETUP.md for detailed guide');
    }
  }
}

// Run the check if this is the main module
const isMainModule = process.argv[1] === __filename;
if (isMainModule) {
  const checker = new DomainChecker();
  checker.runCheck().catch(console.error);
}

export { DomainChecker };