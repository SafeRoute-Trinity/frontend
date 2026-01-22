# Mapbox Setup Guide

## 1. Get Mapbox Access Token

1. Visit [Mapbox Account](https://account.mapbox.com/)
2. Log in or create an account
3. Go to the [Access Tokens](https://account.mapbox.com/access-tokens/) page
4. Create a new access token or use the default token
5. Copy your access token

## 2. Configure Access Token

### Method 1: Using Environment Variables (Recommended)

Edit the `.env` file (in the project root directory) and add:

```env
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=your-mapbox-access-token-here
```

**Note**: Replace `your-mapbox-access-token-here` with your actual token obtained from Mapbox.

### Method 2: Set Directly in Configuration File

If you don't want to use environment variables, you can directly edit the `config/mapbox.ts` file:

```typescript
const MAPBOX_ACCESS_TOKEN = 'your-mapbox-access-token-here';
```

## 3. Configuration Details

### Current Implementation

The project has been configured with two map solutions:

1. **react-native-maps** (Currently in use)
   - Default uses Google Maps
   - Already installed but requires Google Maps API key configuration (if using Google Maps)
   - Or can switch to Mapbox style

2. **@rnmapbox/maps** (Installed, optional)
   - True Mapbox SDK
   - Requires Mapbox access token
   - Requires running `npx expo prebuild` to configure native code

### Using react-native-maps (Current Solution)

If you continue using `react-native-maps`, you need to configure Google Maps API key:

Add to `app.config.ts`:

```typescript
ios: {
  config: {
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  },
},
android: {
  config: {
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  },
},
```

Then add to the `.env` file:

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### Using @rnmapbox/maps (Recommended, True Mapbox)

If you want to use the true Mapbox SDK:

1. Ensure `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` is configured in the `.env` file
2. Run `npx expo prebuild` to generate native configuration
3. Update code to use `@rnmapbox/maps` components

## 4. Verify Configuration

After configuration:

1. Restart the Expo development server: `npx expo start --clear`
2. If using native Mapbox, you need to rebuild the app:
   ```bash
   npx expo prebuild
   npx expo run:ios
   # or
   npx expo run:android
   ```

## 5. Troubleshooting

### Token Not Working

- Ensure environment variables start with `EXPO_PUBLIC_`
- Restart the Expo development server
- For production builds, you need to rebuild the app

### Map Not Displaying

- Check if the access token is correct
- Check network connection
- Check console error messages

## Links to Get Access Token

- [Mapbox Account](https://account.mapbox.com/)
- [Access Tokens Page](https://account.mapbox.com/access-tokens/)
- [Mapbox Documentation](https://docs.mapbox.com/)
