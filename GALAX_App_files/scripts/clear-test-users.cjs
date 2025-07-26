#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');

const dataDirectory = process.env.DATA_DIRECTORY || './data';
const dbPath = path.join(dataDirectory, 'database.sqlite');

async function clearTestUsers() {
  console.log('🧹 Clearing test users from database...');
  
  try {
    const db = new Database(dbPath);
    
    // Get current user count
    const beforeCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log(`📊 Current user count: ${beforeCount.count}`);
    
    // List current users
    const users = db.prepare('SELECT id, username, email, phone FROM users').all();
    console.log('👥 Current users:');
    users.forEach((user) => {
      console.log(`  - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Phone: ${user.phone || 'N/A'}`);
    });
    
    // Delete all users (this will reset the table)
    const deleteResult = db.prepare('DELETE FROM users').run();
    console.log(`🗑️  Deleted ${deleteResult.changes} users`);
    
    // Also clear related data that might reference users
    const tables = [
      'help_requests',
      'governance_proposals', 
      'proposal_votes',
      'messages',
      'delegates',
      'transactions',
      'notifications',
      'user_connections',
      'password_reset_tokens',
      'passkey_credentials',
      'oauth_accounts',
      'email_verification_tokens',
      'phone_verification_tokens',
      'kyc_verifications',
      'stablecoin_transactions'
    ];
    
    for (const table of tables) {
      try {
        const result = db.prepare(`DELETE FROM ${table}`).run();
        if (result.changes > 0) {
          console.log(`🗑️  Cleared ${result.changes} records from ${table}`);
        }
      } catch (error) {
        // Table might not exist, that's okay
        console.log(`⚠️  Could not clear ${table} (table might not exist)`);
      }
    }
    
    // Reset auto-increment counters
    db.prepare('DELETE FROM sqlite_sequence').run();
    console.log('🔄 Reset auto-increment counters');
    
    // Verify cleanup
    const afterCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log(`✅ Final user count: ${afterCount.count}`);
    
    db.close();
    console.log('✅ Database cleanup completed successfully!');
    console.log('🚀 You can now test registration and login with a fresh database');
    
  } catch (error) {
    console.error('❌ Error clearing test users:', error);
    process.exit(1);
  }
}

// Run the script
clearTestUsers().catch(console.error);