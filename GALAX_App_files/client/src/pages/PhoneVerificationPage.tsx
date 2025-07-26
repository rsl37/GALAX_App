/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

// Added 2025-01-11 17:01:45 UTC - Phone verification page component
import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, CheckCircle, AlertCircle, RefreshCw, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export function PhoneVerificationPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const parseApiResponse = async (response: Response) => {
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
        }
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error('Expected JSON response but got: ' + (text.substring(0, 100) + (text.length > 100 ? '...' : '')));
    }

    return await response.json();
  };

  const sendVerificationCode = async () => {
    setIsSending(true);
    setError('');
    setSuccess('');

    try {
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        setError('You must be logged in to verify your phone');
        return;
      }

      const response = await fetch('/api/auth/send-phone-verification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      const apiData = await parseApiResponse(response);
      
      if (apiData.success || response.ok) {
        setSuccess('Verification code sent to your phone!');
        setStep('code');
      }
    } catch (error) {
      console.error('Send verification error:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = async () => {
    setIsVerifying(true);
    setError('');

    try {
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        setError('You must be logged in to verify your phone');
        return;
      }

      const response = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, code }),
      });

      const apiData = await parseApiResponse(response);
      
      if (apiData.success || response.ok) {
        setSuccess('Phone verified successfully!');
        await refreshUser();
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (error) {
      console.error('Phone verification error:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const resendCode = async () => {
    await sendVerificationCode();
  };

  // If user phone is already verified, redirect to dashboard
  if (user?.phone_verified) {
    navigate('/dashboard');
    return null;
  }

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
              <Phone className="h-16 w-16 text-blue-500" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {step === 'phone' ? 'Verify Your Phone' : 'Enter Verification Code'}
            </CardTitle>
            <CardDescription>
              {step === 'phone' 
                ? 'Add your phone number for enhanced security and notifications'
                : `We've sent a 6-digit code to ${phone}`
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Success</span>
                </div>
                <p className="text-green-600 text-sm mt-1">{success}</p>
              </div>
            )}

            {step === 'phone' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isSending}
                  />
                  <p className="text-xs text-gray-500">
                    Include your country code (e.g., +1 for US)
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700 mb-2">
                    <Shield className="h-5 w-5" />
                    <span className="font-medium">Why verify your phone?</span>
                  </div>
                  <ul className="text-blue-600 text-sm space-y-1">
                    <li>• Enhanced account security</li>
                    <li>• Receive urgent notifications</li>
                    <li>• Enable two-factor authentication</li>
                    <li>• Faster account recovery</li>
                  </ul>
                </div>

                <Button
                  onClick={sendVerificationCode}
                  disabled={!phone || isSending}
                  className="galax-button w-full"
                >
                  {isSending ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Sending Code...
                    </div>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={isVerifying}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                  />
                  <p className="text-xs text-gray-500 text-center">
                    Enter the 6-digit code sent to your phone
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={verifyCode}
                    disabled={code.length !== 6 || isVerifying}
                    className="galax-button w-full"
                  >
                    {isVerifying ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Verifying...
                      </div>
                    ) : (
                      'Verify Phone'
                    )}
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      onClick={resendCode}
                      disabled={isSending}
                      variant="outline"
                      className="flex-1"
                    >
                      Resend Code
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setStep('phone');
                        setCode('');
                        setError('');
                        setSuccess('');
                      }}
                      variant="ghost"
                      className="flex-1"
                    >
                      Change Number
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-center">
              <Button
                onClick={() => navigate('/dashboard')}
                variant="ghost"
                className="text-sm"
              >
                Skip for now
              </Button>
            </div>
            
            <div className="text-center text-xs text-gray-500">
              <p>
                Your phone number is encrypted and stored securely.
              </p>
              <p className="mt-1">
                Standard message rates may apply.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}