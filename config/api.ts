import { Platform } from 'react-native';
import { coreEndpoints } from './core-endpoints';

// Determine API URL based on platform
const getApiUrl = () => {
  if (coreEndpoints.backendBaseUrl) {
    return coreEndpoints.backendBaseUrl;
  }

  // Development defaults
  if (Platform.OS === 'android') {
    // Android Emulator special alias to host localhost
    return 'http://10.0.2.2:20000';
  }
  if (Platform.OS === 'ios') {
    return 'http://localhost:20000';
  }
  // Web
  return 'http://localhost:20000';
};

export const API_URL = getApiUrl();

// SOS service – in production the ingress routes /v1/emergency/* to the SOS
// service, so we use the same base URL. Locally, it runs on a separate port.
const getSosApiUrl = () => {
  if (process.env.EXPO_PUBLIC_SOS_API_URL) {
    return process.env.EXPO_PUBLIC_SOS_API_URL;
  }
  if (coreEndpoints.backendBaseUrl) {
    return coreEndpoints.backendBaseUrl;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:20006';
  }
  return 'http://localhost:20006';
};

export const SOS_API_URL = getSosApiUrl();
