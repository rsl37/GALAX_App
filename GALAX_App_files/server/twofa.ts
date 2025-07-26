/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

// Added 2025-01-11 17:01:45 UTC - Two-Factor Authentication functionality
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import { db } from './database.js';
import { encryptPersonalData, decryptPersonalData } from './encryption.js';

/**
 * Generates a new TOTP secret for a user
 */
export async function generate2FASecret(userId: number, username: string): Promise<{ secret: string; qrCode: string } | null> {
  try {
    console.log('🔐 Generating 2FA secret for user:', userId);
    
    // Generate a secure secret
    const secret = speakeasy.generateSecret({
      name: `GALAX (${username})`,
      issuer: 'GALAX App',
      length: 32
    });

    if (!secret.base32) {
      throw new Error('Failed to generate secret');
    }

    // Encrypt the secret before storing
    const encryptedSecret = encryptPersonalData(secret.base32);

    // Store encrypted secret in database (don't enable 2FA yet)
    await db
      .updateTable('users')
      .set({ 
        two_factor_secret: encryptedSecret,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', userId)
      .execute();

    // Generate QR code for easy setup
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    console.log('✅ 2FA secret generated successfully');
    return {
      secret: secret.base32,
      qrCode: qrCodeUrl
    };
  } catch (error) {
    console.error('❌ 2FA secret generation failed:', error);
    return null;
  }
}

/**
 * Enables 2FA for a user after verifying the initial code
 */
export async function enable2FA(userId: number, verificationCode: string): Promise<boolean> {
  try {
    console.log('🔒 Enabling 2FA for user:', userId);
    
    // Get user's secret
    const user = await db
      .selectFrom('users')
      .select(['two_factor_secret'])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user?.two_factor_secret) {
      console.log('❌ No 2FA secret found for user');
      return false;
    }

    // Decrypt the secret
    const secret = decryptPersonalData(user.two_factor_secret);

    // Verify the code
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: verificationCode,
      window: 2 // Allow 2 time steps before/after current time
    });

    if (!verified) {
      console.log('❌ Invalid 2FA verification code');
      return false;
    }

    // Enable 2FA
    await db
      .updateTable('users')
      .set({ 
        two_factor_enabled: 1,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', userId)
      .execute();

    console.log('✅ 2FA enabled successfully for user:', userId);
    return true;
  } catch (error) {
    console.error('❌ Failed to enable 2FA:', error);
    return false;
  }
}

/**
 * Disables 2FA for a user
 */
export async function disable2FA(userId: number, verificationCode: string): Promise<boolean> {
  try {
    console.log('🔓 Disabling 2FA for user:', userId);
    
    // Verify current 2FA code before disabling
    const isValid = await verify2FACode(userId, verificationCode);
    
    if (!isValid) {
      console.log('❌ Invalid 2FA code for disabling');
      return false;
    }

    // Disable 2FA and remove secret
    await db
      .updateTable('users')
      .set({ 
        two_factor_enabled: 0,
        two_factor_secret: null,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', userId)
      .execute();

    console.log('✅ 2FA disabled successfully for user:', userId);
    return true;
  } catch (error) {
    console.error('❌ Failed to disable 2FA:', error);
    return false;
  }
}

/**
 * Verifies a 2FA code during login or other sensitive operations
 */
export async function verify2FACode(userId: number, verificationCode: string): Promise<boolean> {
  try {
    console.log('🔍 Verifying 2FA code for user:', userId);
    
    // Get user's 2FA settings
    const user = await db
      .selectFrom('users')
      .select(['two_factor_enabled', 'two_factor_secret'])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      console.log('❌ User not found');
      return false;
    }

    if (!user.two_factor_enabled || !user.two_factor_secret) {
      console.log('❌ 2FA not enabled for user');
      return false;
    }

    // Decrypt the secret
    const secret = decryptPersonalData(user.two_factor_secret);

    // Verify the code
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: verificationCode,
      window: 2 // Allow 2 time steps before/after current time
    });

    if (verified) {
      console.log('✅ 2FA code verified successfully');
    } else {
      console.log('❌ Invalid 2FA code');
    }

    return verified;
  } catch (error) {
    console.error('❌ 2FA code verification failed:', error);
    return false;
  }
}

/**
 * Generates backup codes for 2FA recovery
 */
export async function generateBackupCodes(userId: number): Promise<string[] | null> {
  try {
    console.log('🔑 Generating backup codes for user:', userId);
    
    // Generate 10 backup codes
    const backupCodes = Array.from({ length: 10 }, () => {
      return randomBytes(6).toString('hex').toUpperCase();
    });

    // Encrypt backup codes for storage
    const encryptedCodes = encryptPersonalData(JSON.stringify(backupCodes));

    // Store in a separate table or use a JSON field
    // For now, we'll add it to the users table (would be better in a separate table)
    await db
      .updateTable('users')
      .set({ 
        // Note: This requires adding a backup_codes field to the users table
        // backup_codes: encryptedCodes,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', userId)
      .execute();

    console.log('✅ Backup codes generated successfully');
    return backupCodes;
  } catch (error) {
    console.error('❌ Backup codes generation failed:', error);
    return null;
  }
}

/**
 * Validates a backup code
 */
export async function validateBackupCode(userId: number, backupCode: string): Promise<boolean> {
  try {
    console.log('🔍 Validating backup code for user:', userId);
    
    // This would require implementing backup code storage and validation
    // For now, return false as backup codes need additional database schema
    console.log('❌ Backup code validation not implemented yet (requires additional schema)');
    return false;
  } catch (error) {
    console.error('❌ Backup code validation failed:', error);
    return false;
  }
}

/**
 * Checks if user has 2FA enabled
 */
export async function is2FAEnabled(userId: number): Promise<boolean> {
  try {
    const user = await db
      .selectFrom('users')
      .select(['two_factor_enabled'])
      .where('id', '=', userId)
      .executeTakeFirst();

    return user?.two_factor_enabled === 1;
  } catch (error) {
    console.error('❌ Failed to check 2FA status:', error);
    return false;
  }
}

/**
 * Gets 2FA setup status for a user
 */
export async function get2FAStatus(userId: number): Promise<{
  enabled: boolean;
  hasSecret: boolean;
}> {
  try {
    const user = await db
      .selectFrom('users')
      .select(['two_factor_enabled', 'two_factor_secret'])
      .where('id', '=', userId)
      .executeTakeFirst();

    return {
      enabled: user?.two_factor_enabled === 1,
      hasSecret: !!user?.two_factor_secret
    };
  } catch (error) {
    console.error('❌ Failed to get 2FA status:', error);
    return {
      enabled: false,
      hasSecret: false
    };
  }
}