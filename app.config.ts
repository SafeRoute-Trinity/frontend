import type { ExpoConfig } from "expo/config";

// Auth0 configuration - get from environment variables or use defaults
const AUTH0_DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN || 'saferoute.eu.auth0.com';
const AUTH0_SCHEME = "saferouteapp";

const config: ExpoConfig = {
  name: "saferoute-app",
  slug: "saferoute-app",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: AUTH0_SCHEME,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.anonymous.saferouteapp",
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "This app needs access to your location to show your position on the map.",
      NSLocationAlwaysAndWhenInUseUsageDescription: "This app uses your location in the background to provide continuous tracking.",
    },
  },
  android: {
    package: "com.anonymous.saferouteapp",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "@rnmapbox/maps",
      {
        RNMapboxMapsDownloadToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || "",
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission: "Allow SafeRoute to use your location to show your position on the map.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    userManagementHealthUrl: process.env.EXPO_PUBLIC_USER_MANAGEMENT_HEALTH_URL,
    notificationServiceHealthUrl: process.env.EXPO_PUBLIC_NOTIFICATION_SERVICE_HEALTH_URL,
    routingServiceHealthUrl: process.env.EXPO_PUBLIC_ROUTING_SERVICE_HEALTH_URL,
    feedbackServiceHealthUrl: process.env.EXPO_PUBLIC_FEEDBACK_SERVICE_HEALTH_URL,
    sosServiceHealthUrl: process.env.EXPO_PUBLIC_SOS_SERVICE_HEALTH_URL,
    mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
  },
};

export default config;



