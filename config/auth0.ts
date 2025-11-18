import { Platform } from 'react-native';

// Get configuration from environment variables or constants
// In production, it's recommended to use environment variables
// Note: Domain should NOT include https://, just the domain name (e.g., your-tenant.auth0.com)
const AUTH0_DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN || 'YOUR_AUTH0_DOMAIN';
const AUTH0_CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || 'YOUR_AUTH0_CLIENT_ID';

export const auth0Config = {
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
};

// Lazy initialization of Auth0 to avoid loading native module until it's actually needed
let auth0Instance: any = null;
let initializationAttempted = false;

function initializeAuth0(): any {
  if (auth0Instance !== null) {
    return auth0Instance;
  }

  if (Platform.OS === 'web') {
    return null;
  }

  if (!initializationAttempted) {
    initializationAttempted = true;
    
    // Suppress console warnings for TurboModule errors during initialization
    const originalWarn = console.warn;
    const originalError = console.error;
    
    try {
      // Temporarily suppress TurboModule warnings
      console.warn = (...args: any[]) => {
        const message = args[0]?.toString() || '';
        if (message.includes('TurboModuleRegistry') || message.includes('A0Auth0')) {
          // Suppress this specific warning - it's expected when native module isn't linked
          return;
        }
        originalWarn.apply(console, args);
      };
      
      console.error = (...args: any[]) => {
        const message = args[0]?.toString() || '';
        if (message.includes('TurboModuleRegistry') || message.includes('A0Auth0')) {
          // Suppress this specific error - it's expected when native module isn't linked
          return;
        }
        originalError.apply(console, args);
      };
      
      // Try to load and initialize Auth0
      const Auth0Module = require('react-native-auth0');
      const Auth0Class = Auth0Module.default || Auth0Module;
      auth0Instance = new Auth0Class({
        domain: AUTH0_DOMAIN,
        clientId: AUTH0_CLIENT_ID,
      });
    } catch (error: any) {
      // Silently handle the error - it's expected when the app hasn't been rebuilt
      // The error will be handled gracefully when Auth0 is actually used
      auth0Instance = null;
    } finally {
      // Restore original console methods
      console.warn = originalWarn;
      console.error = originalError;
    }
  }

  return auth0Instance;
}

// Export a getter function that lazily initializes Auth0
export function getAuth0() {
  return initializeAuth0();
}

// For backward compatibility, export auth0 as a getter
// This will be null if the native module isn't available
export const auth0 = new Proxy({} as any, {
  get(_target, prop) {
    const instance = initializeAuth0();
    if (instance === null) {
      return undefined;
    }
    return instance[prop];
  },
});

