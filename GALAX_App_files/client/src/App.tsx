/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BottomNavigation } from './components/BottomNavigation';
import { EmailVerificationBanner } from './components/EmailVerificationBanner';
import { AnimatedBackground } from './components/AnimatedBackground';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages for better performance
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage').then(module => ({ default: module.RegisterPage })));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage').then(module => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage').then(module => ({ default: module.ResetPasswordPage })));
const EmailVerificationPage = React.lazy(() => import('./pages/EmailVerificationPage').then(module => ({ default: module.EmailVerificationPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const HelpRequestsPage = React.lazy(() => import('./pages/HelpRequestsPage').then(module => ({ default: module.HelpRequestsPage })));
const CrisisPage = React.lazy(() => import('./pages/CrisisPage').then(module => ({ default: module.CrisisPage })));
const GovernancePage = React.lazy(() => import('./pages/GovernancePage').then(module => ({ default: module.GovernancePage })));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
const StablecoinPage = React.lazy(() => import('./pages/StablecoinPage').then(module => ({ default: module.StablecoinPage })));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AppContent() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50">
      <AnimatedBackground />
      <div className="fixed inset-0 bg-pattern opacity-5"></div>
      <div className="relative z-10">
        {/* Email verification banner */}
        {user && <EmailVerificationBanner />}
        
        <div className="pb-20">
          <React.Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<EmailVerificationPage />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/help" element={
                <ProtectedRoute>
                  <HelpRequestsPage />
                </ProtectedRoute>
              } />
              <Route path="/crisis" element={
                <ProtectedRoute>
                  <CrisisPage />
                </ProtectedRoute>
              } />
              <Route path="/governance" element={
                <ProtectedRoute>
                  <GovernancePage />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              <Route path="/stablecoin" element={
                <ProtectedRoute>
                  <StablecoinPage />
                </ProtectedRoute>
              } />
              <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
            </Routes>
          </React.Suspense>
        </div>
      </div>
      {user && <BottomNavigation />}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to console in development
        console.error('App Error Boundary:', error, errorInfo);
        
        // In production, could send to monitoring service
        if (process.env.NODE_ENV === 'production') {
          // Analytics or error reporting service
          console.log('Error reported to monitoring service');
        }
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary fallback={
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
                <p className="text-gray-600">Please refresh the page and try again.</p>
              </div>
            </div>
          }>
            <AppContent />
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
