/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { db } from './database.js';
import { sql } from 'kysely';

export async function debugDatabaseTables() {
  console.log('🔍 Debugging database tables...');
  
  try {
    // Check if tables exist using raw SQL for sqlite_master system table
    const tableCheck = await sql`
      SELECT name, type 
      FROM sqlite_master 
      WHERE type = 'table'
    `.execute(db);
    
    console.log('📊 Available tables:');
    tableCheck.rows.forEach((table: any) => {
      console.log(`  - ${table.name} (${table.type})`);
    });
    
    // Check users table specifically
    try {
      const userCount = await db
        .selectFrom('users')
        .select(db.fn.count('id').as('count'))
        .executeTakeFirst();
      
      console.log('👥 Users table count:', userCount?.count || 0);
      
      // Get first user if exists
      const firstUser = await db
        .selectFrom('users')
        .selectAll()
        .limit(1)
        .executeTakeFirst();
      
      if (firstUser) {
        console.log('👤 First user sample:', {
          id: firstUser.id,
          username: firstUser.username,
          email: firstUser.email,
          created_at: firstUser.created_at
        });
      }
    } catch (error) {
      console.error('❌ Error checking users table:', error);
    }
    
    // Check help_requests table
    try {
      const helpRequestCount = await db
        .selectFrom('help_requests')
        .select(db.fn.count('id').as('count'))
        .executeTakeFirst();
      
      console.log('🤝 Help requests table count:', helpRequestCount?.count || 0);
    } catch (error) {
      console.error('❌ Error checking help_requests table:', error);
    }
    
  } catch (error) {
    console.error('❌ Debug database tables error:', error);
  }
}

export async function createTestUser() {
  console.log('🧪 Creating test user...');
  
  try {
    const existingUser = await db
      .selectFrom('users')
      .selectAll()
      .where('username', '=', 'testuser')
      .executeTakeFirst();
    
    if (existingUser) {
      console.log('✅ Test user already exists:', existingUser.username);
      return existingUser;
    }
    
    const testUser = await db
      .insertInto('users')
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'dummy_hash',
        reputation_score: 0,
        ap_balance: 1000,
        crowds_balance: 0,
        gov_balance: 0,
        roles: 'helper,requester,voter',
        skills: '[]',
        badges: '[]'
      })
      .returning('id')
      .executeTakeFirst();
    
    console.log('✅ Test user created:', testUser?.id);
    return testUser;
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  }
}

export async function runDatabaseDiagnostics() {
  console.log('🔬 Running database diagnostics...');
  
  await debugDatabaseTables();
  
  try {
    await createTestUser();
  } catch (error) {
    console.error('❌ Test user creation failed:', error);
  }
  
  console.log('✅ Database diagnostics completed');
}
