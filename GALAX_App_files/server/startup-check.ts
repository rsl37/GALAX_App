/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { runDatabaseDiagnostics } from './debug.js';
import { diagnoseDatabaseFile } from './database-diagnostics.js';
import { db } from './database.js';
import { sql } from 'kysely';

export async function performStartupCheck() {
  console.log('🚀 Performing startup check...');
  
  try {
    // Check environment variables
    console.log('🌍 Environment check:');
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log('  - PORT:', process.env.PORT);
    console.log('  - DATA_DIRECTORY:', process.env.DATA_DIRECTORY);
    console.log('  - JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Not set');
    
    // Check database file specifically
    console.log('🗄️ Database file check:');
    const diagnostics = await diagnoseDatabaseFile();
    
    if (!diagnostics.exists) {
      console.log('❌ Database file does not exist - this is the problem!');
      console.log('📁 Expected path:', diagnostics.path);
      return false;
    }
    
    if (!diagnostics.valid) {
      console.log('❌ Database file is not valid SQLite - this is the problem!');
      console.log('📁 File path:', diagnostics.path);
      return false;
    }
    
    // Check database connection
    console.log('🗄️ Database connection check:');
    await runDatabaseDiagnostics();
    
    // Check required tables
    console.log('📋 Required tables check:');
    const requiredTables = [
      'users', 'help_requests', 'crisis_alerts', 'proposals', 
      'votes', 'messages', 'transactions', 'chat_rooms', 
      'notifications', 'user_connections'
    ];
    
    let allTablesExist = true;
    for (const tableName of requiredTables) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM ${sql.id(tableName)}`.execute(db);
        const count = (result.rows[0] as any)?.count || 0;
        
        console.log(`  ✅ ${tableName}: ${count} records`);
      } catch (error) {
        console.log(`  ❌ ${tableName}: Error - ${error.message}`);
        allTablesExist = false;
      }
    }
    
    if (!allTablesExist) {
      console.log('❌ Some required tables are missing');
      return false;
    }
    
    console.log('✅ Startup check completed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Startup check failed:', error);
    console.error('🔍 This is likely the database issue you are experiencing');
    return false;
  }
}
