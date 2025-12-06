/**
 * Authentication Screen Component
 * Requirements: 1.1, 1.5
 * Manages the authentication flow (login or create account)
 */

import React, { useState, useEffect } from 'react';
import { LoginForm } from './LoginForm';
import { CreateAccountForm } from './CreateAccountForm';
import { LandingPage } from './LandingPage';
import { authService } from '../services/auth/auth';
import { useAuth } from '../contexts/AuthContext';

export const AuthScreen: React.FC = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [mode, setMode] = useState<'login' | 'create'>('login');
  const [isCheckingAccount, setIsCheckingAccount] = useState(true);
  const { login } = useAuth();

  // Check if account exists on mount
  useEffect(() => {
    const checkAccount = async () => {
      try {
        const exists = await authService.accountExists();
        setMode(exists ? 'login' : 'create');
      } catch (error) {
        console.error('Failed to check account:', error);
        setMode('create');
      } finally {
        setIsCheckingAccount(false);
      }
    };

    checkAccount();
  }, []);

  const handleSuccess = () => {
    login();
  };

  const handleGetStarted = () => {
    setShowLanding(false);
  };

  if (isCheckingAccount) {
    return (
      <div className="auth-screen">
        <div className="auth-container">
          <h1>PantryEye</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (showLanding) {
    return <LandingPage onGetStarted={handleGetStarted} />;
  }

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <h1>PantryEye</h1>
        <p className="tagline">Privacy-first inventory management</p>
        
        {mode === 'login' ? (
          <LoginForm
            onSuccess={handleSuccess}
            onSwitchToCreate={() => setMode('create')}
          />
        ) : (
          <CreateAccountForm
            onSuccess={handleSuccess}
            onSwitchToLogin={() => setMode('login')}
          />
        )}
      </div>
    </div>
  );
};
