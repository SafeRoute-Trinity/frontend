import { API_URL } from '../config/api';
import { getDeviceId } from '../utils/device';
import { storage } from '../utils/storage';

export const AUTH_KEYS = {
  USER: 'auth0_user',
  ACCESS_TOKEN: 'auth0_access_token',
  REFRESH_TOKEN: 'auth0_refresh_token',
};

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Enhanced fetch wrapper that handles:
 * 1. Base URL
 * 2. Auth headers (Bearer token)
 * 3. Session headers (X-Session-Id, X-Device-Id)
 */
export const apiClient = {
  async fetch(endpoint: string, options: FetchOptions = {}) {
    // Ensure endpoint starts with /
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_URL}${path}`;

    const headers = new Headers(options.headers);

    // Default content type
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Add Auth Headers unless skipped
    if (!options.skipAuth) {
      const accessToken = await storage.getItem(AUTH_KEYS.ACCESS_TOKEN);

      const deviceId = await getDeviceId();

      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
      if (deviceId) {
        headers.set('X-Device-Id', deviceId);
      }
    }

    const method = options.method || 'GET';
    const headersObj: Record<string, string> = {};
    headers.forEach((value, key) => {
      headersObj[key] = value;
    });

    console.log(`🌐 [API] ${method} ${url}`, {
      headers: {
        ...headersObj,
        Authorization: headersObj.authorization
          ? `Bearer ${headersObj.authorization.substring(7, 15)}...`
          : 'MISSING',
      },
    });

    const response = await fetch(url, {
      ...options,
      headers,
    });

    return response;
  },

  get(endpoint: string, options: FetchOptions = {}) {
    return this.fetch(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint: string, body: any, options: FetchOptions = {}) {
    return this.fetch(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(endpoint: string, body: any, options: FetchOptions = {}) {
    return this.fetch(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete(endpoint: string, options: FetchOptions = {}) {
    return this.fetch(endpoint, { ...options, method: 'DELETE' });
  },
};
