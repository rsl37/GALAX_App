/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { db } from './database.js';
import { sql } from 'kysely';

// Added 2025-01-11 for urgent performance fixes
export async function createPerformanceIndexes() {
  console.log('🚀 Creating performance indexes...');
  
  const indexes = [
    // User table indexes for common queries
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)', 
    'CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address)',
    'CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified)',
    'CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON users(phone_verified)',
    
    // Help requests indexes
    'CREATE INDEX IF NOT EXISTS idx_help_requests_requester ON help_requests(requester_id)',
    'CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status)',
    'CREATE INDEX IF NOT EXISTS idx_help_requests_category ON help_requests(category)',
    'CREATE INDEX IF NOT EXISTS idx_help_requests_urgency ON help_requests(urgency)',
    'CREATE INDEX IF NOT EXISTS idx_help_requests_created_at ON help_requests(created_at)',
    
    // Proposals indexes
    'CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON proposals(created_by)',
    'CREATE INDEX IF NOT EXISTS idx_proposals_category ON proposals(category)',
    'CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status)',
    'CREATE INDEX IF NOT EXISTS idx_proposals_deadline ON proposals(deadline)',
    
    // Votes indexes
    'CREATE INDEX IF NOT EXISTS idx_votes_proposal_id ON votes(proposal_id)',
    'CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_votes_proposal_user ON votes(proposal_id, user_id)',
    
    // Crisis alerts indexes
    'CREATE INDEX IF NOT EXISTS idx_crisis_alerts_created_by ON crisis_alerts(created_by)',
    'CREATE INDEX IF NOT EXISTS idx_crisis_alerts_status ON crisis_alerts(status)',
    'CREATE INDEX IF NOT EXISTS idx_crisis_alerts_severity ON crisis_alerts(severity)',
    
    // Messages indexes
    'CREATE INDEX IF NOT EXISTS idx_messages_help_request ON messages(help_request_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)',
    
    // Verification tokens indexes
    'CREATE INDEX IF NOT EXISTS idx_email_verification_user ON email_verification_tokens(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_phone_verification_user ON phone_verification_tokens(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id)',
    
    // KYC indexes
    'CREATE INDEX IF NOT EXISTS idx_kyc_verifications_user ON kyc_verifications(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_kyc_verifications_status ON kyc_verifications(status)',
    
    // Composite indexes for common query patterns
    'CREATE INDEX IF NOT EXISTS idx_help_requests_status_created ON help_requests(status, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_proposals_status_category ON proposals(status, category)',
    'CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(email_verified, phone_verified)'
  ];
  
  let created = 0;
  let errors = 0;
  
  for (const indexSql of indexes) {
    try {
      await sql`${sql.raw(indexSql)}`.execute(db);
      created++;
    } catch (error: any) {
      console.warn(`⚠️ Index creation warning: ${error.message}`);
      errors++;
    }
  }
  
  console.log(`✅ Performance indexes: ${created} created, ${errors} warnings`);
  return { created, errors };
}

// Function to analyze query performance
export async function analyzeQueryPerformance() {
  console.log('📊 Analyzing query performance...');
  
  try {
    // Check if EXPLAIN QUERY PLAN is available
    const sampleQueries = [
      'SELECT * FROM users WHERE email = ?',
      'SELECT * FROM help_requests WHERE status = ? ORDER BY created_at DESC',
      'SELECT * FROM proposals WHERE category = ? AND status = ?',
      'SELECT COUNT(*) FROM votes WHERE proposal_id = ?'
    ];
    
    for (const query of sampleQueries) {
      try {
        const explainResult = await sql`EXPLAIN QUERY PLAN ${sql.raw(query.replace(/\?/g, "'test'"))}`.execute(db);
        console.log(`📈 Query plan for: ${query}`);
        console.log('   Plan:', explainResult.rows);
      } catch (error) {
        console.warn(`⚠️ Could not analyze query: ${query}`);
      }
    }
  } catch (error) {
    console.warn('⚠️ Query performance analysis not available');
  }
}