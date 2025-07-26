/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token]);

  const parseApiResponse = async (response: Response) => {
    // Check if response is OK
    if (!response.ok) {
      let errorMessage = 'Request failed';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          if (errorData.error && typeof errorData.error === 'object') {
            errorMessage = errorData.error.message || errorMessage;
          } else if (errorData.error && typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } else {
          // Non-JSON response, likely HTML error page
          const text = await response.text();
          if (text.includes('<html') || text.includes('<!DOCTYPE')) {
            throw new Error('Server returned an error page instead of JSON. Please check your API routes.');
          }
          errorMessage = text || errorMessage;
        }
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
      }
      throw new Error(errorMessage);
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error('Expected JSON response but got: ' + (text.substring(0, 100) + (text.length > 100 ? '...' : '')));
    }

    try {
      const data = await response.json();
      return data;
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      const text = await response.text();
      throw new Error('Invalid JSON response: ' + text.substring(0, 100));
    }
  };

  const verifyEmail = async (verificationToken: string) => {
    setIsVerifying(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      const apiData = await parseApiResponse(response);
      
      if (apiData.success || response.ok) {
        setIsVerified(true);
        // Refresh user data to update email verification status
        await refreshUser();
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      }
    } catch (error) {
      console.error('Email verification error:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const resendVerification = async () => {
    setIsResending(true);
    setError('');
    setResendSuccess(false);

    try {
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        setError('You must be logged in to resend verification email');
        return;
      }

      const response = await fetch('/api/auth/send-email-verification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const apiData = await parseApiResponse(response);
      
      if (apiData.success || response.ok) {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  // If user is already verified, redirect to dashboard
  if (user?.email_verified) {
    navigate('/dashboard');
    return null;
  }

  // Token verification in progress
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="galax-card">
            <CardContent className="p-8 text-center">
              <div className="animate-spin mx-auto mb-4 h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
              <h2 className="text-xl font-semibold mb-2">Verifying Your Email</h2>
              <p className="text-gray-600">Please wait while we verify your email address...</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Email successfully verified
  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="galax-card">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-600">
                Email Verified!
              </CardTitle>
              <CardDescription>
                Your email has been successfully verified. Welcome to GALAX!
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-800 font-medium">🎉 You can now:</p>
                <ul className="text-green-700 text-sm mt-2 space-y-1">
                  <li>• Access all platform features</li>
                  <li>• Request and offer help</li>
                  <li>• Participate in governance</li>
                  <li>• Receive important notifications</li>
                </ul>
              </div>
              
              <p className="text-sm text-gray-600">
                Redirecting to dashboard in a few seconds...
              </p>
              
              <Button
                onClick={() => navigate('/dashboard')}
                className="galax-button w-full"
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Error state or verification prompt
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="galax-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Mail className="h-16 w-16 text-blue-500" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Verify Your Email
            </CardTitle>
            <CardDescription>
              {error ? 'Email verification failed' : 'Check your email for a verification link'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Verification Failed</span>
                </div>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-gray-600">
                  We've sent a verification email to <strong>{user?.email}</strong>
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    📧 Check your inbox (and spam folder) for the verification email.
                    Click the link in the email to verify your account.
                  </p>
                </div>
              </div>
            )}
            
            {resendSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Email Sent!</span>
                </div>
                <p className="text-green-600 text-sm mt-1">
                  A new verification email has been sent to your inbox.
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <Button
                onClick={resendVerification}
                disabled={isResending}
                variant="outline"
                className="w-full"
              >
                {isResending ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Resend Verification Email
                  </div>
                )}
              </Button>
              
              <Button
                onClick={() => navigate('/dashboard')}
                variant="ghost"
                className="w-full"
              >
                I'll verify later
              </Button>
            </div>
            
            <div className="text-center text-xs text-gray-500">
              <p>
                Didn't receive the email? Check your spam folder or try resending.
              </p>
              <p className="mt-1">
                Need help? Contact support at support@galax.app
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
