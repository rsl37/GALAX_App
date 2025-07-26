/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, CheckCircle, AlertCircle, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const [isHidden, setIsHidden] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState('');

  // Don't show banner if user is verified, has no email, or banner is hidden
  if (!user || user.email_verified || !user.email || isHidden) {
    return null;
  }

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

  const resendVerification = async () => {
    setIsResending(true);
    setError('');
    setResendSuccess(false);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to resend verification email');
        return;
      }

      const response = await fetch('/api/auth/send-email-verification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 right-0 z-50 p-4"
      >
        <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-full">
                  <Mail className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-800">
                    Email Verification Required
                  </h3>
                  <p className="text-sm text-orange-700">
                    Please verify your email address to access all features.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={resendVerification}
                  disabled={isResending}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isResending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    'Resend Email'
                  )}
                </Button>
                
                <Button
                  onClick={() => setIsHidden(true)}
                  variant="ghost"
                  size="sm"
                  className="text-orange-600 hover:text-orange-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {resendSuccess && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
                className="mt-3 flex items-center gap-2 text-green-700 bg-green-50 p-2 rounded-md"
              >
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Verification email sent successfully!</span>
              </motion.div>
            )}
            
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
                className="mt-3 flex items-center gap-2 text-red-700 bg-red-50 p-2 rounded-md"
              >
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
