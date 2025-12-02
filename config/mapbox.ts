// Mapbox configuration
// Get Mapbox access token from environment variables
// IMPORTANT: Never hardcode access tokens in source code. Always use environment variables.
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export const mapboxConfig = {
  accessToken: MAPBOX_ACCESS_TOKEN,
};

// Initialize Mapbox (this should be called before using Mapbox components)
// This function can be called with an optional Mapbox instance if already imported
export function initializeMapbox(mapboxInstance?: any) {
  if (!MAPBOX_ACCESS_TOKEN) {
    console.warn('Mapbox access token is not set. Please add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env file');
    return false;
  }
  
  // Set the access token for @rnmapbox/maps
  try {
    const Mapbox = mapboxInstance || require('@rnmapbox/maps');
    Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
    return true;
  } catch (error) {
    console.error('Failed to initialize Mapbox:', error);
    return false;
  }
}


