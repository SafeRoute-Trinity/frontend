// Determine API URL based on platform.
// Falls back to the production URL so the packaged APK always has a valid base URL
// even when EXPO_PUBLIC_API_URL is not registered as an EAS secret.
const PRODUCTION_API_URL = 'https://saferoutemap.duckdns.org';
const getApiUrl = () => process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL;
// const getApiUrl = () => {
//   if (process.env.EXPO_PUBLIC_API_URL) {
//     return process.env.EXPO_PUBLIC_API_URL;
//   }

//   // Development defaults
//   if (Platform.OS === 'android') {
//     // Android Emulator special alias to host localhost
//     return 'http://10.0.2.2:20000';
//   }
//   if (Platform.OS === 'ios') {
//     return 'http://localhost:20000';
//   }
//   // Web
//   return 'http://localhost:20000';
// };

export const API_URL = getApiUrl();

// SOS service – in production the ingress routes /v1/emergency/* to the SOS
// service, so we use the same base URL. Locally, it runs on a separate port.
const getSosApiUrl = () => process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL;
// const getSosApiUrl = () => {
//   if (process.env.EXPO_PUBLIC_SOS_API_URL) {
//     return process.env.EXPO_PUBLIC_SOS_API_URL;
//   }
//   if (process.env.EXPO_PUBLIC_API_URL) {
//     return process.env.EXPO_PUBLIC_API_URL;
//   }
//   if (Platform.OS === 'android') {
//     return 'http://10.0.2.2:20006';
//   }
//   return 'http://localhost:20006';
// };

export const SOS_API_URL = getSosApiUrl();
