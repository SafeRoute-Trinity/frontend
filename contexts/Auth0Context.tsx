import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { getAuth0 } from '../config/auth0';

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
  logout: () => Promise<void>;
  clearSession: () => Promise<void>;
  error: Error | null;
}

const Auth0Context = createContext<Auth0ContextType | undefined>(undefined);

const USER_KEY = 'auth0_user';
const ACCESS_TOKEN_KEY = 'auth0_access_token';
const REFRESH_TOKEN_KEY = 'auth0_refresh_token';

// Simple storage implementation for web platform
const simpleStore = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignore
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
  },
};

async function getStoredItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return simpleStore.getItem(key);
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setStoredItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    return simpleStore.setItem(key, value);
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Ignore
  }
}

async function removeStoredItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    return simpleStore.removeItem(key);
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignore
  }
}

export function Auth0Provider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Restore user information from storage
  useEffect(() => {
    async function loadUser() {
      try {
        const storedUser = await getStoredItem(USER_KEY);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error('Failed to load user:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (showSignup: boolean = false, forceLogin: boolean = false) => {
    try {
      setError(null);
      setIsLoading(true);

      const auth0 = getAuth0();
      if (!auth0) {
        throw new Error('Auth0 native module is not available. Please rebuild the app with: npx expo prebuild && npx expo run:ios');
      }

      const redirectUri = "saferouteapp://auth/callback";

      // Use Auth0 webAuth for login or signup
      const credentials = await auth0.webAuth.authorize({
        // Type definitions don't include redirectUri, but the runtime library expects it.
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        ...( {
          scope: 'openid profile email offline_access',
          redirectUri,
          ...(showSignup ? { screen_hint: 'signup' } : {}),
          ...(forceLogin ? { prompt: 'login' } : {})
        } as any ),
      });

      // Save tokens
      if (credentials.accessToken) {
        await setStoredItem(ACCESS_TOKEN_KEY, credentials.accessToken);
      }
      if (credentials.refreshToken) {
        await setStoredItem(REFRESH_TOKEN_KEY, credentials.refreshToken);
      }

      // Get user information
      const userInfo = await auth0.auth.userInfo({
        token: credentials.accessToken,
      });

      setUser(userInfo);
      await setStoredItem(USER_KEY, JSON.stringify(userInfo));
    } catch (err: any) {
      // User cancellation is not considered an error
      if (err.error !== 'a0.session.user_cancelled') {
        setError(err);
        console.error('Login error:', err);
      }
    } finally {
      setIsLoading(false);
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

      // Clear Auth0 session
      await clearSession();

      // Clear stored tokens and user data
      await removeStoredItem(ACCESS_TOKEN_KEY);
      await removeStoredItem(REFRESH_TOKEN_KEY);
      await removeStoredItem(USER_KEY);

      // Clear user state - this will trigger UI update
      setUser(null);
    } catch (err) {
      // Even if there's an error, try to clear user state
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
    logout,
    clearSession,
    error,
  };

  return <Auth0Context.Provider value={value}>{children}</Auth0Context.Provider>;
}

export function useAuth0() {
  const context = useContext(Auth0Context);
  if (context === undefined) {
    throw new Error('useAuth0 must be used within an Auth0Provider');
  }
  return context;
}

