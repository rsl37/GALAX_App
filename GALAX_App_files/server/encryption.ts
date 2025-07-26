/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

// Added 2025-01-11 17:01:45 UTC - Encryption utilities for personal data security
import crypto from 'crypto';

// Configuration for encryption - using AES-256-GCM (256-bit) minimum as specified in requirements
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for GCM
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

// Environment variable for master encryption key
const MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY || crypto.randomBytes(KEY_LENGTH).toString('hex');

if (!process.env.ENCRYPTION_MASTER_KEY) {
  console.warn('⚠️ ENCRYPTION_MASTER_KEY not set in environment. Using random key (data will not persist across restarts)');
}

/**
 * Derives a 256-bit encryption key from the master key and salt
 */
function deriveKey(salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(Buffer.from(MASTER_KEY, 'hex'), salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypts personal data using AES-256-GCM with random salt and IV
 * Meets requirement for minimum 256-bit encryption (can be upgraded to 512-bit by using AES-512 when available)
 */
export function encryptPersonalData(data: string): string {
  try {
    // Generate random salt and IV for each encryption operation
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive encryption key from master key and salt
    const key = deriveKey(salt);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(salt); // Additional authenticated data
    
    // Encrypt the data
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine salt + iv + tag + encrypted data
    const combined = Buffer.concat([
      salt,
      iv, 
      tag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('❌ Encryption failed:', error);
    throw new Error('Failed to encrypt personal data');
  }
}

/**
 * Decrypts personal data that was encrypted with encryptPersonalData
 */
export function decryptPersonalData(encryptedData: string): string {
  try {
    // Parse the combined data
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Derive the same key used for encryption
    const key = deriveKey(salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(salt);
    decipher.setAuthTag(tag);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('❌ Decryption failed:', error);
    throw new Error('Failed to decrypt personal data');
  }
}

/**
 * Creates a secure hash of a document for integrity verification
 * Uses SHA-512 for document hashing (512-bit)
 */
export function hashDocument(data: Buffer): string {
  return crypto.createHash('sha512').update(data).digest('hex');
}

/**
 * Encrypts document data for secure storage
 * Uses AES-256-GCM with document-specific key derivation
 */
export function encryptDocument(documentData: Buffer, documentId: string): string {
  try {
    // Use document ID as additional entropy for key derivation
    const salt = crypto.createHash('sha256').update(documentId).digest();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive document-specific key
    const key = crypto.pbkdf2Sync(Buffer.from(MASTER_KEY, 'hex'), salt, 100000, KEY_LENGTH, 'sha512');
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from(documentId, 'utf8'));
    
    // Encrypt the document
    const encrypted = Buffer.concat([
      cipher.update(documentData),
      cipher.final()
    ]);
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine iv + tag + encrypted data
    const combined = Buffer.concat([iv, tag, encrypted]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('❌ Document encryption failed:', error);
    throw new Error('Failed to encrypt document');
  }
}

/**
 * Decrypts document data that was encrypted with encryptDocument
 */
export function decryptDocument(encryptedData: string, documentId: string): Buffer {
  try {
    // Parse the combined data
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);
    
    // Derive the same key used for encryption
    const salt = crypto.createHash('sha256').update(documentId).digest();
    const key = crypto.pbkdf2Sync(Buffer.from(MASTER_KEY, 'hex'), salt, 100000, KEY_LENGTH, 'sha512');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(Buffer.from(documentId, 'utf8'));
    decipher.setAuthTag(tag);
    
    // Decrypt the document
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return decrypted;
  } catch (error) {
    console.error('❌ Document decryption failed:', error);
    throw new Error('Failed to decrypt document');
  }
}

/**
 * Generates a cryptographically secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generates a time-based one-time password secret for 2FA
 */
export function generate2FASecret(): string {
  // Generate a 256-bit (32-byte) secret for TOTP, encode as hex
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Creates a secure hash for storing sensitive data like phone numbers
 */
export function hashSensitiveData(data: string, salt?: string): { hash: string; salt: string } {
  const saltBuffer = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(32);
  const hash = crypto.pbkdf2Sync(data, saltBuffer, 100000, 64, 'sha512');
  
  return {
    hash: hash.toString('hex'),
    salt: saltBuffer.toString('hex')
  };
}

/**
 * Verifies a hash against the original data
 */
export function verifySensitiveData(data: string, hash: string, salt: string): boolean {
  try {
    const { hash: newHash } = hashSensitiveData(data, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(newHash, 'hex'));
  } catch (error) {
    console.error('❌ Hash verification failed:', error);
    return false;
  }
}