import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'saferoute_device_id';

// Simple storage implementation for web platform
const simpleStore = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignore
    }
  },
};

// Simple UUID v4 generator since we don't have the uuid package installed
const generateUUID = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

/**
 * Gets a persistent unique device identifier.
 * Generates one if it doesn't exist and stores it securely.
 */
export const getDeviceId = async (): Promise<string> => {
  try {
    let deviceId: string | null = null;

    if (Platform.OS === 'web') {
      deviceId = simpleStore.getItem(DEVICE_ID_KEY);
    } else {
      deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    }

    if (!deviceId) {
      // Generate a new UUID for this device
      deviceId = generateUUID();

      if (Platform.OS === 'web') {
        simpleStore.setItem(DEVICE_ID_KEY, deviceId);
      } else {
        await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
      }
    }

    return deviceId;
  } catch (error) {
    console.error('Failed to get/generate device ID:', error);
    // Return a temporary ID if storage fails (won't persist but allows app to work)
    return `temp_${Date.now().toString(36)}`;
  }
};

export const getDeviceName = (): string =>
  `${Platform.OS.charAt(0).toUpperCase() + Platform.OS.slice(1)} Device`;
