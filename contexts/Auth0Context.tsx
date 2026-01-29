/* eslint-disable no-console */
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { apiClient, AUTH_KEYS } from '../api/client';
import { auth0Config, getAuth0 } from '../config/auth0';

import { storage } from '../utils/storage';

interface User {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  [key: string]: any;
}

interface Auth0ContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (showSignup?: boolean, forceLogin?: boolean) => Promise<void>;
  nativeLogin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => Promise<void>;
  error: Error | null;
}

const Auth0Context = createContext<Auth0ContextType | undefined>(undefined);

export const Auth0Provider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Restore user information from storage
  useEffect(() => {
    async function loadUser() {
      try {
        const storedUser = await storage.getItem(AUTH_KEYS.USER);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        // Optional: Verify session is valid by calling /v1/users/me silently
        // If it fails with 401, we should probably logout or clear local state
        // For now, we trust local storage to avoid blocking startup
      } catch (err) {
        console.error('Failed to load user:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const nativeLogin = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);

      console.log('🔍 Starting native login with email:', email);

      // Call Auth0 OAuth token endpoint with Resource Owner Password Grant
      const response = await fetch(`https://${auth0Config.domain}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'password',
          username: email.trim(),
          password,
          client_id: auth0Config.clientId,
          scope: 'openid profile email offline_access',
          realm: 'Username-Password-Authentication', // Specify database connection
          audience: 'https://saferouteapp.eu.auth0.com/api/v2/', // Add audience to get JWT tokens
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Auth0 login error:', errorData);

        // Handle specific error cases
        if (errorData.error === 'invalid_grant') {
          throw new Error('Invalid email or password');
        } else if (errorData.error === 'access_denied') {
          throw new Error('Account access has been denied');
        } else {
          throw new Error(
            errorData.error_description || errorData.message || 'Login failed. Please try again.'
          );
        }
      }

      const credentials = await response.json();
      console.log('✅ Native login successful! Tokens received');

      // Save tokens
      if (credentials.access_token) {
        await storage.setItem(AUTH_KEYS.ACCESS_TOKEN, credentials.access_token);
        console.log('💾 Access token saved');
      }
      if (credentials.refresh_token) {
        await storage.setItem(AUTH_KEYS.REFRESH_TOKEN, credentials.refresh_token);
        console.log('💾 Refresh token saved');
      }

      // Get user information from Auth0
      console.log('🔍 Fetching user info from Auth0...');
      const userInfoResponse = await fetch(`https://${auth0Config.domain}/userinfo`, {
        headers: {
          Authorization: `Bearer ${credentials.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error('❌ Failed to fetch user information');
      }

      const userInfo = await userInfoResponse.json();
      console.log('✅ User info received:', { email: userInfo.email, sub: userInfo.sub });

      setUser(userInfo);
      await storage.setItem(AUTH_KEYS.USER, JSON.stringify(userInfo));

      // VERIFICATION: Verify backend connection by calling a protected endpoint
      console.log('🔍 Verified Backend Connection: Calling /v1/users/me...');
      try {
        await apiClient.get('/v1/users/me');
        console.log('✅ Backend verification successful!');
      } catch (backendErr) {
        console.error('❌ Backend verification failed:', backendErr);
      }

      console.log('✅ Native login complete! User:', userInfo.email || userInfo.sub);
    } catch (err: any) {
      setError(err);
      console.error('❌ Native login error:', err);
      console.error('❌ Error message:', err.message);
      throw err; // Re-throw so the login page can handle it
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (showSignup: boolean = false, forceLogin: boolean = false) => {
    try {
      setError(null);
      setIsLoading(true);

      console.log('🔍 Starting login process...', { showSignup, forceLogin });

      const auth0 = getAuth0();
      if (!auth0) {
        throw new Error(
          'Auth0 native module is not available. Please rebuild the app with: npx expo prebuild && npx expo run:ios'
        );
      }

      const redirectUri = 'saferouteapp://auth/callback';

      console.log('🔍 Calling auth0.webAuth.authorize with:', {
        scope: 'openid profile email offline_access',
        redirectUri,
        prompt: 'login',
        showSignup,
      });

      // Add timeout to detect if WebView fails to load
      const authorizePromise = auth0.webAuth.authorize({
        // Type definitions don't include redirectUri, but the runtime library expects it.
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        ...({
          scope: 'openid profile email offline_access',
          redirectUri,
          ...(showSignup
            ? {
                screen_hint: 'signup',
                // Additional metadata for signup - these will be available in Auth0 Actions
                login_hint: 'Please provide your full name and ensure passwords match',
              }
            : {}),
          // Always prompt for login to avoid consent screen with cached sessions
          prompt: 'login',
        } as any),
      });

      // Wait for 5 seconds to see if WebView loads
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.log('⏳ 5 seconds elapsed - WebView might be stuck on blank page');
        }, 5000);
      });

      // Race between authorize and timeout (just for logging, won't actually timeout)
      Promise.race([authorizePromise, timeoutPromise]).catch(() => {});

      // Use Auth0 webAuth for login or signup
      const credentials = await authorizePromise;

      console.log('✅ Authorization completed! Credentials received');

      // Save tokens
      if (credentials.accessToken) {
        await storage.setItem(AUTH_KEYS.ACCESS_TOKEN, credentials.accessToken);
        console.log('💾 Access token saved');
      }
      if (credentials.refreshToken) {
        await storage.setItem(AUTH_KEYS.REFRESH_TOKEN, credentials.refreshToken);
        console.log('💾 Refresh token saved');
      }

      console.log('🔍 Fetching user info...');
      // Get user information
      const userInfo = await auth0.auth.userInfo({
        token: credentials.accessToken,
      });

      console.log('✅ User info received:', { email: userInfo.email, sub: userInfo.sub });

      setUser(userInfo);
      await storage.setItem(AUTH_KEYS.USER, JSON.stringify(userInfo));

      console.log('✅ Login successful! User:', userInfo.email || userInfo.sub);
    } catch (err: any) {
      // User cancellation is not considered an error
      if (err.error !== 'a0.session.user_cancelled') {
        setError(err);
        console.error('❌ Login error:', err);

        // Provide helpful error message for blank page issue
        if (err.message && err.message.includes('network')) {
          console.error('💡 Network error detected. Please check emulator internet connection.');
        }
      } else {
        console.log('ℹ️ User cancelled login');
      }
    } finally {
      setIsLoading(false);
      console.log('🔍 Login process finished');
    }
  };

  const clearSession = async () => {
    try {
      const auth0 = getAuth0();
      if (auth0) {
        await auth0.webAuth.clearSession();
      }
    } catch (err) {
      console.error('Clear session error:', err);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // 1. Clear stored tokens and user data
      await storage.removeItem(AUTH_KEYS.ACCESS_TOKEN);
      await storage.removeItem(AUTH_KEYS.REFRESH_TOKEN);
      await storage.removeItem(AUTH_KEYS.USER);
      // 2. Clear user state - this will trigger UI update
      setUser(null);

      console.log('✅ Logout complete');
    } catch (err) {
      setError(err as Error);
      console.error('Logout error:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const value: Auth0ContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    nativeLogin,
    logout,
    clearSession,
    error,
  };

  return <Auth0Context.Provider value={value}>{children}</Auth0Context.Provider>;
};

export const useAuth0 = () => {
  const context = useContext(Auth0Context);
  if (context === undefined) {
    throw new Error('useAuth0 must be used within an Auth0Provider');
  }
  return context;
};
