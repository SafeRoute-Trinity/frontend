import Auth0 from 'react-native-auth0';

// Get configuration from environment variables or constants
// In production, it's recommended to use environment variables
// Note: Domain should NOT include https://, just the domain name (e.g., your-tenant.auth0.com)
const AUTH0_DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN || 'YOUR_AUTH0_DOMAIN';
const AUTH0_CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || 'YOUR_AUTH0_CLIENT_ID';

export const auth0 = new Auth0({
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
});

export const auth0Config = {
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
};

