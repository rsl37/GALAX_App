/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  email: string | null;
  username: string;
  avatar_url: string | null;
  reputation_score: number;
  ap_balance: number;
  crowds_balance: number;
  gov_balance: number;
  roles: string;
  skills: string;
  badges: string;
  email_verified: boolean;
  phone_verified: boolean;
  two_factor_enabled: boolean;
  created_at?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  loginWithWallet: (walletAddress: string) => Promise<void>;
  register: (emailOrPhone: string, password: string, username: string, signupMethod?: 'email' | 'phone') => Promise<void>;
  registerWithWallet: (walletAddress: string, username: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

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

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const apiData = await parseApiResponse(response);
        
        // Handle both old and new response formats
        const userData = apiData.success ? apiData.data : apiData;
        
        setUser({
          ...userData,
          email_verified: userData.email_verified === 1 || userData.email_verified === true,
          phone_verified: userData.phone_verified === 1 || userData.phone_verified === true,
          two_factor_enabled: userData.two_factor_enabled === 1 || userData.two_factor_enabled === true
        });
      } else {
        // If unauthorized, remove token
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('token');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const apiData = await parseApiResponse(response);
        
        // Handle both old and new response formats
        const userData = apiData.success ? apiData.data : apiData;
        
        setUser({
          ...userData,
          email_verified: userData.email_verified === 1 || userData.email_verified === true,
          phone_verified: userData.phone_verified === 1 || userData.phone_verified === true,
          two_factor_enabled: userData.two_factor_enabled === 1 || userData.two_factor_enabled === true
        });
      }
    } catch (error) {
      console.error('User refresh error:', error);
    }
  };

  const login = async (emailOrPhone: string, password: string) => {
    try {
      // Determine if it's an email or phone number
      const isEmail = emailOrPhone.includes('@');
      const requestBody = isEmail 
        ? { email: emailOrPhone, password }
        : { phone: emailOrPhone, password };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const apiData = await parseApiResponse(response);
      
      // Handle both old and new response formats
      const responseData = apiData.success ? apiData.data : apiData;
      
      if (responseData.token) {
        localStorage.setItem('token', responseData.token);
        await checkAuthStatus();
      } else {
        throw new Error('No authentication token received');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithWallet = async (walletAddress: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      const apiData = await parseApiResponse(response);
      
      // Handle both old and new response formats
      const responseData = apiData.success ? apiData.data : apiData;
      
      if (responseData.token) {
        localStorage.setItem('token', responseData.token);
        await checkAuthStatus();
      } else {
        throw new Error('No authentication token received');
      }
    } catch (error) {
      console.error('Wallet login error:', error);
      throw error;
    }
  };

  const register = async (emailOrPhone: string, password: string, username: string, signupMethod?: 'email' | 'phone') => {
    try {
      // Determine if it's an email or phone number
      const isEmail = signupMethod === 'email' || (!signupMethod && emailOrPhone.includes('@'));
      const requestBody = isEmail 
        ? { email: emailOrPhone, password, username }
        : { phone: emailOrPhone, password, username };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const apiData = await parseApiResponse(response);
      
      // Handle both old and new response formats
      const responseData = apiData.success ? apiData.data : apiData;
      
      if (responseData.token) {
        localStorage.setItem('token', responseData.token);
        await checkAuthStatus();
      } else {
        throw new Error('No authentication token received');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const registerWithWallet = async (walletAddress: string, username: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress, username }),
      });

      const apiData = await parseApiResponse(response);
      
      // Handle both old and new response formats
      const responseData = apiData.success ? apiData.data : apiData;
      
      if (responseData.token) {
        localStorage.setItem('token', responseData.token);
        await checkAuthStatus();
      } else {
        throw new Error('No authentication token received');
      }
    } catch (error) {
      console.error('Wallet registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    login,
    loginWithWallet,
    register,
    registerWithWallet,
    logout,
    isLoading,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
