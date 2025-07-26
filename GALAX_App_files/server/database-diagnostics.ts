/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export async function diagnoseDatabaseFile() {
  console.log('🔍 === DATABASE FILE DIAGNOSTICS ===');
  
  const dataDirectory = process.env.DATA_DIRECTORY || './data';
  const databasePath = path.join(dataDirectory, 'database.sqlite');
  
  console.log('📁 Data directory:', dataDirectory);
  console.log('📊 Database path:', databasePath);
  console.log('🔍 Absolute database path:', path.resolve(databasePath));
  
  // Check if data directory exists
  if (!fs.existsSync(dataDirectory)) {
    console.log('❌ Data directory does not exist');
    console.log('🔧 Creating data directory...');
    fs.mkdirSync(dataDirectory, { recursive: true });
    console.log('✅ Data directory created');
  } else {
    console.log('✅ Data directory exists');
  }
  
  // Check if database file exists
  if (!fs.existsSync(databasePath)) {
    console.log('❌ Database file does not exist at:', databasePath);
    console.log('🔧 This is the issue - SQLite cannot find the database file');
    return { exists: false, path: databasePath };
  } else {
    console.log('✅ Database file exists');
    
    // Check file stats
    const stats = fs.statSync(databasePath);
    console.log('📊 File size:', stats.size, 'bytes');
    console.log('📅 Created:', stats.birthtime);
    console.log('📅 Modified:', stats.mtime);
    
    // Check if it's a valid SQLite file
    try {
      const buffer = fs.readFileSync(databasePath, { encoding: null });
      const header = buffer.slice(0, 16).toString('ascii');
      console.log('🔍 File header:', header);
      
      if (header.startsWith('SQLite format 3')) {
        console.log('✅ File is a valid SQLite database');
      } else {
        console.log('❌ File is not a valid SQLite database');
        console.log('🔧 File header should start with "SQLite format 3"');
        return { exists: true, valid: false, path: databasePath };
      }
    } catch (error) {
      console.error('❌ Error reading database file:', error);
      return { exists: true, valid: false, path: databasePath };
    }
  }
  
  // Try to connect to the database
  try {
    console.log('🔌 Attempting to connect to database...');
    const db = new Database(databasePath);
    
    // Test basic query
    const result = db.prepare('SELECT sqlite_version()').get();
    console.log('✅ Database connection successful');
    console.log('📊 SQLite version:', result['sqlite_version()']);
    
    // Check if tables exist
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();
    
    console.log('📋 Tables in database:', tables.length);
    tables.forEach((table: any) => {
      console.log('  - ', table.name);
    });
    
    db.close();
    return { exists: true, valid: true, path: databasePath, tables: tables.length };
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return { exists: true, valid: false, path: databasePath, error: error.message };
  }
}

export async function createInitialDatabase() {
  console.log('🔧 Creating initial database with tables...');
  
  const dataDirectory = process.env.DATA_DIRECTORY || './data';
  const databasePath = path.join(dataDirectory, 'database.sqlite');
  
  // Ensure directory exists
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }
  
  // Create database and tables
  const db = new Database(databasePath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Create tables
  console.log('📋 Creating tables...');
  
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password_hash TEXT,
      wallet_address TEXT UNIQUE,
      username TEXT UNIQUE NOT NULL,
      avatar_url TEXT,
      reputation_score INTEGER DEFAULT 0,
      ap_balance INTEGER DEFAULT 1000,
      crowds_balance INTEGER DEFAULT 0,
      gov_balance INTEGER DEFAULT 0,
      roles TEXT DEFAULT 'helper,requester,voter',
      skills TEXT DEFAULT '[]',
      badges TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Help requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS help_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER NOT NULL,
      helper_id INTEGER,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      urgency TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      skills_needed TEXT DEFAULT '[]',
      media_url TEXT,
      media_type TEXT DEFAULT 'none',
      is_offline_created INTEGER DEFAULT 0,
      offline_created_at DATETIME,
      matching_score REAL DEFAULT 0,
      status TEXT DEFAULT 'posted',
      helper_confirmed_at DATETIME,
      started_at DATETIME,
      completed_at DATETIME,
      rating INTEGER,
      feedback TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requester_id) REFERENCES users(id),
      FOREIGN KEY (helper_id) REFERENCES users(id)
    )
  `);
  
  // Crisis alerts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS crisis_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radius INTEGER DEFAULT 1000,
      created_by INTEGER NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);
  
  // Proposals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      created_by INTEGER NOT NULL,
      deadline DATETIME NOT NULL,
      status TEXT DEFAULT 'active',
      votes_for INTEGER DEFAULT 0,
      votes_against INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);
  
  // Votes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proposal_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      vote_type TEXT NOT NULL,
      delegate_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (proposal_id) REFERENCES proposals(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (delegate_id) REFERENCES users(id)
    )
  `);
  
  // Messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      help_request_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (help_request_id) REFERENCES help_requests(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )
  `);
  
  // Delegates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS delegates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delegator_id INTEGER NOT NULL,
      delegate_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (delegator_id) REFERENCES users(id),
      FOREIGN KEY (delegate_id) REFERENCES users(id)
    )
  `);
  
  // Transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      token_type TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  // Chat rooms table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      help_request_id INTEGER NOT NULL,
      requester_id INTEGER NOT NULL,
      helper_id INTEGER NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (help_request_id) REFERENCES help_requests(id),
      FOREIGN KEY (requester_id) REFERENCES users(id),
      FOREIGN KEY (helper_id) REFERENCES users(id)
    )
  `);
  
  // Notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT DEFAULT '{}',
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  // User connections table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      socket_id TEXT NOT NULL,
      connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  console.log('✅ All tables created successfully');
  
  // Verify tables were created
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all();
  
  console.log('📋 Created tables:', tables.length);
  tables.forEach((table: any) => {
    console.log('  ✅', table.name);
  });
  
  db.close();
  
  return { success: true, path: databasePath, tables: tables.length };
}
