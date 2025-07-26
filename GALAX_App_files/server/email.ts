/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';
import { db } from './database.js';

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Password Reset Functions
export async function generatePasswordResetToken(email: string): Promise<string | null> {
  try {
    console.log('🔐 Generating password reset token for:', email);
    
    // Find user by email
    const user = await db
      .selectFrom('users')
      .select(['id', 'username'])
      .where('email', '=', email)
      .executeTakeFirst();

    if (!user) {
      console.log('❌ User not found for email:', email);
      return null;
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete any existing tokens for this user
    await db
      .deleteFrom('password_reset_tokens')
      .where('user_id', '=', user.id)
      .execute();

    // Store token in database
    await db
      .insertInto('password_reset_tokens')
      .values({
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString()
      })
      .execute();

    console.log('✅ Password reset token generated successfully');
    return token;
  } catch (error) {
    console.error('❌ Password reset token generation failed:', error);
    return null;
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  try {
    console.log('📧 Sending password reset email to:', email);
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'GALAX Support <noreply@galaxcivicnetwork.me>',
      to: email,
      subject: 'Password Reset Request - GALAX',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #B593EE, #92A8D1); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">GALAX</h1>
            <p style="color: white; margin: 5px 0;">Civic Network Platform</p>
          </div>
          
          <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
            
            <p style="color: #666; line-height: 1.6;">
              You requested a password reset for your GALAX account. Click the button below to reset your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #B593EE, #92A8D1); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 10px; 
                        font-weight: bold;
                        display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 14px;">
              If you can't click the button, copy and paste this link into your browser:
            </p>
            <p style="color: #B593EE; word-break: break-all; font-size: 14px;">
              ${resetUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; line-height: 1.5;">
              This link will expire in 24 hours. If you didn't request this password reset, please ignore this email.
              <br><br>
              For security, this link can only be used once.
            </p>
          </div>
        </div>
      `
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode - Password reset link:', resetUrl);
      return true;
    }

    await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Password reset email failed:', error);
    return false;
  }
}

export async function validatePasswordResetToken(token: string): Promise<number | null> {
  try {
    console.log('🔍 Validating password reset token');
    
    const tokenRecord = await db
      .selectFrom('password_reset_tokens')
      .select(['user_id', 'expires_at', 'used_at'])
      .where('token', '=', token)
      .executeTakeFirst();

    if (!tokenRecord) {
      console.log('❌ Invalid token');
      return null;
    }

    if (tokenRecord.used_at) {
      console.log('❌ Token already used');
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);
    
    if (now > expiresAt) {
      console.log('❌ Token expired');
      return null;
    }

    console.log('✅ Token is valid');
    return tokenRecord.user_id;
  } catch (error) {
    console.error('❌ Token validation failed:', error);
    return null;
  }
}

export async function markTokenAsUsed(token: string): Promise<void> {
  try {
    await db
      .updateTable('password_reset_tokens')
      .set({ used_at: new Date().toISOString() })
      .where('token', '=', token)
      .execute();
    
    console.log('✅ Token marked as used');
  } catch (error) {
    console.error('❌ Failed to mark token as used:', error);
  }
}

// Email Verification Functions
export async function generateEmailVerificationToken(userId: number): Promise<string | null> {
  try {
    console.log('📧 Generating email verification token for user:', userId);
    
    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete any existing tokens for this user
    await db
      .deleteFrom('email_verification_tokens')
      .where('user_id', '=', userId)
      .execute();

    // Store token in database
    await db
      .insertInto('email_verification_tokens')
      .values({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString()
      })
      .execute();

    console.log('✅ Email verification token generated successfully');
    return token;
  } catch (error) {
    console.error('❌ Email verification token generation failed:', error);
    return null;
  }
}

export async function sendEmailVerification(email: string, token: string, username: string): Promise<boolean> {
  try {
    console.log('📧 Sending email verification to:', email);
    
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'GALAX Support <noreply@galaxcivicnetwork.me>',
      to: email,
      subject: 'Verify Your Email - GALAX',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #B593EE, #92A8D1); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">GALAX</h1>
            <p style="color: white; margin: 5px 0;">Civic Network Platform</p>
          </div>
          
          <div style="padding: 30px; background: white; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome to GALAX, ${username}!</h2>
            
            <p style="color: #666; line-height: 1.6;">
              Thank you for joining our civic network platform. To complete your registration and start participating in your community, please verify your email address.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #B593EE, #92A8D1); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 10px; 
                        font-weight: bold;
                        display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">What you can do once verified:</h3>
              <ul style="color: #666; line-height: 1.6; margin: 10px 0;">
                <li>🤝 Request and offer help in your community</li>
                <li>🚨 Report and respond to crisis situations</li>
                <li>🗳️ Participate in democratic governance</li>
                <li>💬 Connect with neighbors and civic-minded individuals</li>
                <li>🏆 Earn reputation and community recognition</li>
              </ul>
            </div>
            
            <p style="color: #666; line-height: 1.6; font-size: 14px;">
              If you can't click the button, copy and paste this link into your browser:
            </p>
            <p style="color: #B593EE; word-break: break-all; font-size: 14px;">
              ${verificationUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; line-height: 1.5;">
              This verification link will expire in 24 hours. If you didn't create this account, please ignore this email.
              <br><br>
              Need help? Contact our support team at support@galaxcivicnetwork.me
            </p>
          </div>
        </div>
      `
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode - Email verification link:', verificationUrl);
      return true;
    }

    await transporter.sendMail(mailOptions);
    console.log('✅ Email verification sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Email verification failed:', error);
    return false;
  }
}

export async function validateEmailVerificationToken(token: string): Promise<number | null> {
  try {
    console.log('🔍 Validating email verification token');
    
    const tokenRecord = await db
      .selectFrom('email_verification_tokens')
      .select(['user_id', 'expires_at', 'used_at'])
      .where('token', '=', token)
      .executeTakeFirst();

    if (!tokenRecord) {
      console.log('❌ Invalid verification token');
      return null;
    }

    if (tokenRecord.used_at) {
      console.log('❌ Token already used');
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);
    
    if (now > expiresAt) {
      console.log('❌ Token expired');
      return null;
    }

    console.log('✅ Email verification token is valid');
    return tokenRecord.user_id;
  } catch (error) {
    console.error('❌ Email verification token validation failed:', error);
    return null;
  }
}

export async function markEmailVerificationTokenAsUsed(token: string): Promise<void> {
  try {
    await db
      .updateTable('email_verification_tokens')
      .set({ used_at: new Date().toISOString() })
      .where('token', '=', token)
      .execute();
    
    console.log('✅ Email verification token marked as used');
  } catch (error) {
    console.error('❌ Failed to mark email verification token as used:', error);
  }
}

export async function markEmailAsVerified(userId: number): Promise<void> {
  try {
    await db
      .updateTable('users')
      .set({ 
        email_verified: 1,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', userId)
      .execute();
    
    console.log('✅ Email marked as verified for user:', userId);
  } catch (error) {
    console.error('❌ Failed to mark email as verified:', error);
    throw error;
  }
}

export async function resendEmailVerification(userId: number): Promise<boolean> {
  try {
    console.log('🔄 Resending email verification for user:', userId);
    
    // Get user details
    const user = await db
      .selectFrom('users')
      .select(['email', 'username', 'email_verified'])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      console.log('❌ User not found');
      return false;
    }

    if (!user.email) {
      console.log('❌ User has no email address');
      return false;
    }

    if (user.email_verified) {
      console.log('❌ Email already verified');
      return false;
    }

    // Generate new token
    const token = await generateEmailVerificationToken(userId);
    if (!token) {
      console.log('❌ Failed to generate verification token');
      return false;
    }

    // Send verification email
    const emailSent = await sendEmailVerification(user.email, token, user.username);
    if (!emailSent) {
      console.log('❌ Failed to send verification email');
      return false;
    }

    console.log('✅ Email verification resent successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to resend email verification:', error);
    return false;
  }
}
