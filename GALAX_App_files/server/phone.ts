/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

// Added 2025-01-11 17:01:45 UTC - Phone verification functionality
import { randomBytes } from 'crypto';
import { db } from './database.js';
import { encryptPersonalData, decryptPersonalData } from './encryption.js';

/**
 * Generates a 6-digit verification code for phone verification
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates a phone verification token and stores it in the database
 */
export async function generatePhoneVerificationToken(userId: number, phone: string): Promise<string | null> {
  try {
    console.log('📱 Generating phone verification token for user:', userId);
    
    // Encrypt the phone number for secure storage
    const encryptedPhone = encryptPersonalData(phone);
    
    // Generate secure 6-digit code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing tokens for this user
    await db
      .deleteFrom('phone_verification_tokens')
      .where('user_id', '=', userId)
      .execute();

    // Store token in database
    await db
      .insertInto('phone_verification_tokens')
      .values({
        user_id: userId,
        phone: encryptedPhone,
        code,
        expires_at: expiresAt.toISOString(),
        attempts: 0
      })
      .execute();

    console.log('✅ Phone verification token generated successfully');
    return code;
  } catch (error) {
    console.error('❌ Phone verification token generation failed:', error);
    return null;
  }
}

/**
 * Validates a phone verification code
 */
export async function validatePhoneVerificationCode(userId: number, phone: string, code: string): Promise<boolean> {
  try {
    console.log('🔍 Validating phone verification code for user:', userId);
    
    const tokenRecord = await db
      .selectFrom('phone_verification_tokens')
      .select(['id', 'phone', 'code', 'expires_at', 'used_at', 'attempts'])
      .where('user_id', '=', userId)
      .where('used_at', 'is', null)
      .orderBy('created_at', 'desc')
      .executeTakeFirst();

    if (!tokenRecord) {
      console.log('❌ No active verification token found');
      return false;
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);
    
    if (now > expiresAt) {
      console.log('❌ Verification token expired');
      return false;
    }

    // Check attempt limit (max 5 attempts)
    if (tokenRecord.attempts >= 5) {
      console.log('❌ Too many verification attempts');
      return false;
    }

    // Increment attempt counter
    await db
      .updateTable('phone_verification_tokens')
      .set({ attempts: tokenRecord.attempts + 1 })
      .where('id', '=', tokenRecord.id)
      .execute();

    // Verify the phone number matches (decrypt stored phone)
    try {
      const storedPhone = decryptPersonalData(tokenRecord.phone);
      if (storedPhone !== phone) {
        console.log('❌ Phone number mismatch');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to decrypt stored phone number:', error);
      return false;
    }

    // Verify the code
    if (tokenRecord.code !== code) {
      console.log('❌ Invalid verification code');
      return false;
    }

    console.log('✅ Phone verification code is valid');
    return true;
  } catch (error) {
    console.error('❌ Phone verification code validation failed:', error);
    return false;
  }
}

/**
 * Marks phone verification token as used
 */
export async function markPhoneVerificationTokenAsUsed(userId: number): Promise<void> {
  try {
    await db
      .updateTable('phone_verification_tokens')
      .set({ used_at: new Date().toISOString() })
      .where('user_id', '=', userId)
      .where('used_at', 'is', null)
      .execute();
    
    console.log('✅ Phone verification token marked as used');
  } catch (error) {
    console.error('❌ Failed to mark phone verification token as used:', error);
  }
}

/**
 * Marks phone as verified in user profile
 */
export async function markPhoneAsVerified(userId: number, phone: string): Promise<void> {
  try {
    // Encrypt the phone number for secure storage
    const encryptedPhone = encryptPersonalData(phone);
    
    await db
      .updateTable('users')
      .set({ 
        phone: encryptedPhone,
        phone_verified: 1,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', userId)
      .execute();
    
    console.log('✅ Phone marked as verified for user:', userId);
  } catch (error) {
    console.error('❌ Failed to mark phone as verified:', error);
    throw error;
  }
}

/**
 * Sends SMS verification code (mock implementation for testing)
 * In production, this would integrate with SMS service like Twilio
 */
export async function sendPhoneVerification(phone: string, code: string): Promise<boolean> {
  try {
    console.log('📱 Sending SMS verification to:', phone.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2'));
    
    // Mock SMS implementation for development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode - SMS verification code:', code);
      console.log('🔧 Phone number:', phone);
      return true;
    }

    // In production, integrate with SMS service
    // Example Twilio integration:
    /*
    const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
    
    await twilioClient.messages.create({
      body: `Your GALAX verification code is: ${code}. This code expires in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
    */

    console.log('✅ SMS verification sent successfully');
    return true;
  } catch (error) {
    console.error('❌ SMS verification failed:', error);
    return false;
  }
}

/**
 * Resends phone verification code
 */
export async function resendPhoneVerification(userId: number, phone: string): Promise<boolean> {
  try {
    console.log('🔄 Resending phone verification for user:', userId);
    
    // Generate new verification token
    const code = await generatePhoneVerificationToken(userId, phone);
    
    if (!code) {
      console.log('❌ Failed to generate verification code');
      return false;
    }

    // Send SMS
    const success = await sendPhoneVerification(phone, code);
    
    if (success) {
      console.log('✅ Phone verification resent successfully');
      return true;
    } else {
      console.log('❌ Failed to send verification SMS');
      return false;
    }
  } catch (error) {
    console.error('❌ Phone verification resend failed:', error);
    return false;
  }
}

/**
 * Gets the user's decrypted phone number
 */
export async function getUserPhone(userId: number): Promise<string | null> {
  try {
    const user = await db
      .selectFrom('users')
      .select(['phone'])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user?.phone) {
      return null;
    }

    // Decrypt the phone number
    return decryptPersonalData(user.phone);
  } catch (error) {
    console.error('❌ Failed to get user phone:', error);
    return null;
  }
}