/**
 * Simple API client for making authenticated requests to the backend.
 * Automatically includes Auth0 JWT token in Authorization header.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const ACCESS_TOKEN_KEY = 'auth0_access_token';

// Get API base URL from environment or use default
const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl
  || process.env.EXPO_PUBLIC_API_BASE_URL
  || 'http://localhost:20000';

/**
 * Get stored access token from secure storage
 */
async function getAccessToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Make an authenticated API request
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  async get(endpoint: string) {
    const response = await apiRequest(endpoint, { method: 'GET' });
    return response.json();
  },

  async post(endpoint: string, data: any) {
    const response = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async put(endpoint: string, data: any) {
    const response = await apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async delete(endpoint: string) {
    const response = await apiRequest(endpoint, { method: 'DELETE' });
    return response.json();
  },
};
