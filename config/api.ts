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
