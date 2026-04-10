/* eslint-disable no-console */
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient, AUTH_KEYS } from '../api/client';
import { auth0Config } from '../config/auth0';

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
      const requestBody: Record<string, string> = {
        grant_type: 'password',
        username: email.trim(),
        password,
        client_id: auth0Config.clientId,
        scope: 'openid profile email offline_access',
        realm: 'Username-Password-Authentication',
      };

      if (auth0Config.audience) {
        requestBody.audience = auth0Config.audience;
      }

      const response = await fetch(`https://${auth0Config.domain}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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

      // Trigger auto-create: if the user doesn't exist in our DB yet, /v1/users/me
      // will create them from Auth0 /userinfo. Use the fresh token directly rather
      // than reading it back from SecureStore, to avoid any silent write-failure
      // causing a stale token to be sent.
      console.log('🔍 Syncing user with backend via /v1/users/me...');
      try {
        const meRes = await apiClient.fetch('/v1/users/me', {
          method: 'GET',
          skipAuth: true,
          headers: {
            Authorization: `Bearer ${credentials.access_token}`,
          },
        });
        if (meRes.ok) {
          console.log('✅ Backend user sync successful!');
        } else {
          console.error(
            '❌ Backend user sync failed:',
            meRes.status,
            await meRes.text().catch(() => '')
          );
        }
      } catch (backendErr) {
        console.error('❌ Backend user sync network error:', backendErr);
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
    const _showSignup = showSignup;
    const _forceLogin = forceLogin;
    setError(
      new Error('WebAuth login is disabled in this build. Use nativeLogin(email, password).')
    );
    console.warn('WebAuth login is disabled in this build', {
      showSignup: _showSignup,
      forceLogin: _forceLogin,
    });
  };

  const clearSession = async () => {
    // No-op: we intentionally avoid native webAuth bridge calls in this build.
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

  const value: Auth0ContextType = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      nativeLogin,
      logout,
      clearSession,
      error,
    }),
    [user, isLoading, error] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return <Auth0Context.Provider value={value}>{children}</Auth0Context.Provider>;
};

export const useAuth0 = () => {
  const context = useContext(Auth0Context);
  if (context === undefined) {
    throw new Error('useAuth0 must be used within an Auth0Provider');
  }
  return context;
};
