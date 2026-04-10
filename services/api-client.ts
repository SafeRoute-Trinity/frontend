/**
 * Simple API client for making authenticated requests to the backend.
 * Automatically includes Auth0 JWT token in Authorization header.
 */

/* eslint-disable no-console */
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { coreEndpoints } from '../config/core-endpoints';

import { AUTH_KEYS } from '../api/client';

// Get API base URL from environment or use default
const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ||
  Constants.expoConfig?.extra?.backendBaseUrl ||
  coreEndpoints.backendBaseUrl ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:20000';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Get stored access token from secure storage
 * @returns {Promise<string | null>} The access token or null if not found
 */
const getBearerToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return (
      localStorage.getItem(AUTH_KEYS.ID_TOKEN) ||
      localStorage.getItem(AUTH_KEYS.ACCESS_TOKEN)
    );
  }
  try {
    const id = await SecureStore.getItemAsync(AUTH_KEYS.ID_TOKEN);
    if (id) {
      return id;
    }
    return await SecureStore.getItemAsync(AUTH_KEYS.ACCESS_TOKEN);
  } catch (error) {
    return null;
  }
};

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

/**
 * Make an authenticated API request
 * @param {string} endpoint - The API endpoint to call
 * @param {RequestOptions} options - Fetch options
 * @returns {Promise<Response>} The fetch response
 * @throws {ApiError} If the response status is not ok
 */
export const apiRequest = async (
  endpoint: string,
  options: RequestOptions = {}
): Promise<Response> => {
  const token = await getBearerToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Add Authorization header if token exists
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(`API request failed with status ${response.status}`, response.status);
  }

  return response;
};

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: async <T>(endpoint: string): Promise<T> => {
    const response = await apiRequest(endpoint, { method: 'GET' });
    return response.json() as Promise<T>;
  },

  post: async <T>(endpoint: string, data: unknown): Promise<T> => {
    const response = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json() as Promise<T>;
  },

  put: async <T>(endpoint: string, data: unknown): Promise<T> => {
    const response = await apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json() as Promise<T>;
  },

  delete: async <T>(endpoint: string): Promise<T> => {
    const response = await apiRequest(endpoint, { method: 'DELETE' });
    return response.json() as Promise<T>;
  },
};
