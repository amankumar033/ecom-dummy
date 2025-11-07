'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, getUserData, setUserData, logout as authLogout, isAuthenticated, setAuthToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (userData: User, token?: string) => void;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on app start
    const checkAuth = () => {
      try {
        console.log('🔍 Checking authentication on app start...');
        
        if (isAuthenticated()) {
          console.log('✅ User is authenticated, getting user data...');
          const userData = getUserData();
          console.log('📋 Retrieved user data from localStorage:', userData);
          
          if (userData) {
            setUser(userData);
            console.log('✅ User data set in context:', userData);
          } else {
            console.log('❌ No user data found in localStorage despite being authenticated');
            // Clear invalid authentication
            authLogout();
          }
        } else {
          console.log('❌ User is not authenticated');
        }
      } catch (error) {
        console.error('❌ Error checking authentication:', error);
        // Clear any corrupted data
        authLogout();
      } finally {
        setLoading(false);
      }
    };

    // Use requestIdleCallback for non-blocking auth check
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => checkAuth(), { timeout: 1000 });
    } else {
      setTimeout(checkAuth, 100);
    }
  }, []);

  const login = (userData: User, token?: string) => {
    console.log('🔐 Login function called with:', { userData, token });
    
    try {
      // Store user data in localStorage
      setUserData(userData);
      console.log('💾 User data stored in localStorage');
      
      // Store auth token if provided
      if (token) {
        setAuthToken(token);
        console.log('🔑 Auth token stored in localStorage');
      }
      
      // Update state
      setUser(userData);
      console.log('✅ User logged in successfully:', userData);
      
      // Verify storage
      const storedUser = getUserData();
      const storedToken = token ? localStorage.getItem('auth_token') : null;
      console.log('🔍 Verification - Stored user:', storedUser);
      console.log('🔍 Verification - Stored token:', storedToken ? 'Present' : 'Not present');
      
    } catch (error) {
      console.error('❌ Error during login:', error);
    }
  };

  const logout = async () => {
    console.log('🚪 Logout function called');

    // Instant client-side logout: clear state and navigate without waiting on network
    try {
      setUser(null);
      console.log('🧹 User state cleared');
      authLogout();
      console.log('🧹 localStorage cleared');
    } catch (error) {
      console.error('❌ Error during client logout cleanup:', error);
    }

    // Redirect immediately
    router.push('/');
  };

  const value = {
    user,
    isLoggedIn: !!user,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 