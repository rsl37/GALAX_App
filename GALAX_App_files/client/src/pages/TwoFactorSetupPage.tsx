/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

// Added 2025-01-11 17:01:45 UTC - Two-Factor Authentication setup component
import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, CheckCircle, AlertCircle, RefreshCw, Key, Smartphone, Copy } from 'lucide-react';
import { motion } from 'framer-motion';

export function TwoFactorSetupPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState<'status' | 'setup' | 'verify' | 'complete'>('status');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [status, setStatus] = useState({ enabled: false, hasSecret: false });

  useEffect(() => {
    checkStatus();
  }, []);

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

  const checkStatus = async () => {
    try {
      const authToken = localStorage.getItem('token');
      if (!authToken) return;

      const response = await fetch('/api/auth/2fa/status', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const apiData = await parseApiResponse(response);
      setStatus(apiData.data);
      
      if (apiData.data.enabled) {
        setStep('complete');
      }
    } catch (error) {
      console.error('Status check error:', error);
    }
  };

  const startSetup = async () => {
    setIsLoading(true);
    setError('');

    try {
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        setError('You must be logged in to set up 2FA');
        return;
      }

      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const apiData = await parseApiResponse(response);
      
      if (apiData.success) {
        setQrCode(apiData.data.qrCode);
        setSecret(apiData.data.secret);
        setStep('setup');
      }
    } catch (error) {
      console.error('Setup error:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    setIsLoading(true);
    setError('');

    try {
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        setError('You must be logged in to enable 2FA');
        return;
      }

      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      const apiData = await parseApiResponse(response);
      
      if (apiData.success) {
        setSuccess('Two-factor authentication enabled successfully!');
        await refreshUser();
        setStep('complete');
      }
    } catch (error) {
      console.error('Enable error:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const disable2FA = async () => {
    setIsLoading(true);
    setError('');

    try {
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        setError('You must be logged in to disable 2FA');
        return;
      }

      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      const apiData = await parseApiResponse(response);
      
      if (apiData.success) {
        setSuccess('Two-factor authentication disabled successfully!');
        await refreshUser();
        setStep('status');
        setStatus({ enabled: false, hasSecret: false });
        setVerificationCode('');
      }
    } catch (error) {
      console.error('Disable error:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setSuccess('Secret copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const renderStatusStep = () => (
    <CardContent className="space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
          <Shield className={`h-10 w-10 ${status.enabled ? 'text-green-500' : 'text-blue-500'}`} />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold">
            Two-Factor Authentication
          </h3>
          <p className="text-gray-600">
            {status.enabled 
              ? 'Your account is protected with 2FA' 
              : 'Add an extra layer of security to your account'
            }
          </p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg text-left">
          <h4 className="font-medium text-blue-900 mb-2">Benefits of 2FA:</h4>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Prevents unauthorized access even if password is compromised</li>
            <li>• Required for token mining and high-value transactions</li>
            <li>• Increases account security rating</li>
            <li>• Protects sensitive personal information</li>
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        {!status.enabled ? (
          <Button
            onClick={startSetup}
            disabled={isLoading}
            className="galax-button w-full"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Setting up...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Enable Two-Factor Authentication
              </div>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">2FA is Active</span>
              </div>
              <p className="text-green-600 text-sm mt-1">
                Your account is protected with two-factor authentication.
              </p>
            </div>
            
            <Button
              onClick={() => setStep('verify')}
              variant="outline"
              className="w-full"
            >
              Disable 2FA
            </Button>
          </div>
        )}
        
        <Button
          onClick={() => navigate('/dashboard')}
          variant="ghost"
          className="w-full"
        >
          Back to Dashboard
        </Button>
      </div>
    </CardContent>
  );

  const renderSetupStep = () => (
    <CardContent className="space-y-6">
      <div className="text-center space-y-4">
        <h3 className="text-lg font-semibold">Scan QR Code</h3>
        <p className="text-gray-600">
          Use your authenticator app to scan this QR code
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-lg border">
            <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Manual Entry Key (if QR scanning fails)</Label>
          <div className="flex gap-2">
            <Input
              value={secret}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              onClick={copySecret}
              variant="outline"
              size="sm"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-medium text-yellow-900 mb-2">
            Recommended Authenticator Apps:
          </h4>
          <ul className="text-yellow-800 text-sm space-y-1">
            <li>• Google Authenticator</li>
            <li>• Microsoft Authenticator</li>
            <li>• Authy</li>
            <li>• 1Password</li>
          </ul>
        </div>
      </div>

      <Button
        onClick={() => setStep('verify')}
        className="galax-button w-full"
      >
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          Continue to Verification
        </div>
      </Button>
    </CardContent>
  );

  const renderVerifyStep = () => (
    <CardContent className="space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <Key className="h-8 w-8 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold">
          {status.enabled ? 'Verify to Disable 2FA' : 'Verify Setup'}
        </h3>
        <p className="text-gray-600">
          {status.enabled 
            ? 'Enter your current 2FA code to disable two-factor authentication'
            : 'Enter the 6-digit code from your authenticator app'
          }
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Verification Code</Label>
          <Input
            id="code"
            type="text"
            placeholder="123456"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            disabled={isLoading}
            maxLength={6}
            className="text-center text-2xl tracking-widest"
          />
        </div>

        <div className="space-y-3">
          <Button
            onClick={status.enabled ? disable2FA : verifyAndEnable}
            disabled={verificationCode.length !== 6 || isLoading}
            className={status.enabled ? 'w-full bg-red-500 hover:bg-red-600' : 'galax-button w-full'}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                {status.enabled ? 'Disabling...' : 'Enabling...'}
              </div>
            ) : (
              status.enabled ? 'Disable 2FA' : 'Enable 2FA'
            )}
          </Button>

          <Button
            onClick={() => setStep(status.enabled ? 'status' : 'setup')}
            variant="ghost"
            className="w-full"
          >
            Back
          </Button>
        </div>
      </div>
    </CardContent>
  );

  const renderCompleteStep = () => (
    <CardContent className="space-y-6 text-center">
      <div className="space-y-4">
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h3 className="text-xl font-semibold text-green-600">
          2FA Enabled Successfully!
        </h3>
        <p className="text-gray-600">
          Your account is now protected with two-factor authentication.
        </p>
      </div>

      <div className="bg-green-50 p-4 rounded-lg text-left">
        <h4 className="font-medium text-green-900 mb-2">Important Notes:</h4>
        <ul className="text-green-800 text-sm space-y-1">
          <li>• Keep your authenticator app secure and backed up</li>
          <li>• You'll need your authenticator for future logins</li>
          <li>• Contact support if you lose access to your authenticator</li>
          <li>• Consider setting up backup authentication methods</li>
        </ul>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => navigate('/dashboard')}
          className="galax-button w-full"
        >
          Continue to Dashboard
        </Button>
        
        <Button
          onClick={() => setStep('status')}
          variant="outline"
          className="w-full"
        >
          Manage 2FA Settings
        </Button>
      </div>
    </CardContent>
  );

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
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Secure your account with an additional layer of protection
            </CardDescription>
          </CardHeader>
          
          {error && (
            <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {success && (
            <div className="mx-6 mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Success</span>
              </div>
              <p className="text-green-600 text-sm mt-1">{success}</p>
            </div>
          )}

          {step === 'status' && renderStatusStep()}
          {step === 'setup' && renderSetupStep()}
          {step === 'verify' && renderVerifyStep()}
          {step === 'complete' && renderCompleteStep()}
        </Card>
      </motion.div>
    </div>
  );
}