import { Platform } from 'react-native';

// Determine API URL based on platform
const getApiUrl = () => {
  // For production, you would use an environment variable
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
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
