/**
 * Authentication Context
 * Requirements: 1.5
 * Manages authentication state across the application
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth/auth';
import { database } from '../services/db/database';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  resetSessionTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize database and check authentication status
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Initialize database
        await database.init();
        
        // Check if user is authenticated
        const authenticated = authService.isAuthenticated();
        setIsAuthenticated(authenticated);
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false);
  }, []);

  const resetSessionTimer = useCallback(() => {
    authService.resetSessionTimer();
  }, []);

  // Reset session timer on user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleActivity = () => {
      resetSessionTimer();
    };

    // Listen for user activity events
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [isAuthenticated, resetSessionTimer]);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    login,
    logout,
    resetSessionTimer,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
