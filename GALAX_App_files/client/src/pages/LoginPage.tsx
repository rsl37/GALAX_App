/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Wallet, Mail, Phone, Zap, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { CountryCodeSelector } from '@/components/CountryCodeSelector';
import { Country } from '@/data/countries';

export function LoginPage() {
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithWallet } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Format phone number with country code if it's a phone login
      const identifier = loginMethod === 'email' ? email : `${countryCode}${phone.replace(/^[\+\s0]+/, '')}`;
      await login(identifier, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          await loginWithWallet(accounts[0]);
          navigate('/dashboard');
        }
      } else {
        setError('MetaMask not detected. Please install MetaMask to use wallet login.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wallet login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 galax-holographic">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="galax-card animate-pulse-glow">
          <CardHeader className="text-center pb-8">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex items-center justify-center gap-2 mb-4"
            >
              <Zap className="h-8 w-8 text-purple-500" />
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                GALAX
              </CardTitle>
              <Sparkles className="h-8 w-8 text-coral-500" />
            </motion.div>
            <CardDescription className="text-lg text-gray-600">
              Civic Network Platform
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Login Method Toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              <Button
                type="button"
                variant={loginMethod === 'email' ? 'default' : 'ghost'}
                className={`flex-1 ${loginMethod === 'email' ? 'galax-button' : ''}`}
                onClick={() => setLoginMethod('email')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button
                type="button"
                variant={loginMethod === 'phone' ? 'default' : 'ghost'}
                className={`flex-1 ${loginMethod === 'phone' ? 'galax-button' : ''}`}
                onClick={() => setLoginMethod('phone')}
              >
                <Phone className="h-4 w-4 mr-2" />
                Phone
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">
                  {loginMethod === 'email' ? 'Email' : 'Phone Number'}
                </Label>
                {loginMethod === 'phone' ? (
                  <div className="flex gap-2">
                    <CountryCodeSelector
                      value={countryCode}
                      onChange={(dialCode: string, country: Country) => setCountryCode(dialCode)}
                      className="flex-shrink-0"
                    />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="galax-input flex-1"
                      required
                    />
                  </div>
                ) : (
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="galax-input"
                    required
                  />
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="galax-input"
                  required
                />
              </div>
              
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-xl"
                >
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </motion.div>
              )}
              
              <Button
                type="submit"
                className="w-full galax-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
            
            <div className="text-center">
              <Link to="/forgot-password" className="text-purple-600 hover:text-purple-700 text-sm hover:underline">
                Forgot your password?
              </Link>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full galax-button-accent"
              onClick={handleWalletLogin}
              disabled={isLoading}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Connect MetaMask
            </Button>

            <div className="text-center text-sm">
              <span className="text-gray-600">Don't have an account? </span>
              <Link to="/register" className="text-purple-600 hover:text-purple-700 font-medium hover:underline">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
