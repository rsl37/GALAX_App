/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';

export function setupStaticServing(app: express.Application) {
  const publicDir = path.join(process.cwd(), 'dist', 'public');
  
  console.log('🌐 Setting up static file serving...');
  console.log('📁 Public directory:', publicDir);
  
  // Check if public directory exists
  if (!fs.existsSync(publicDir)) {
    console.error('❌ Public directory does not exist:', publicDir);
    return;
  }
  
  // Serve static files
  app.use(express.static(publicDir));
  
  // Handle client-side routing - serve index.html for all non-API routes
  // Use a more specific pattern to avoid path-to-regexp issues
  app.get('/', (req, res) => {
    const indexPath = path.join(publicDir, 'index.html');
    
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error('❌ index.html not found at:', indexPath);
      res.status(404).send('Application not built. Please run build command.');
    }
  });
  
  // Handle all other routes that don't start with /api/
  app.use((req, res, next) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    const indexPath = path.join(publicDir, 'index.html');
    
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error('❌ index.html not found at:', indexPath);
      res.status(404).send('Application not built. Please run build command.');
    }
  });
  
  console.log('✅ Static file serving configured');
}
