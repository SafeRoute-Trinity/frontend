// Mapbox configuration
// Get Mapbox access token from environment variables
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export const mapboxConfig = {
  accessToken: MAPBOX_ACCESS_TOKEN,
};

// Initialize Mapbox (this should be called before using Mapbox components)
export function initializeMapbox() {
  if (!MAPBOX_ACCESS_TOKEN) {
    console.warn('Mapbox access token is not set. Please add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env file');
    return false;
  }
  
  // Set the access token for @rnmapbox/maps
  // This will be done in the component that uses Mapbox
  return true;
}


