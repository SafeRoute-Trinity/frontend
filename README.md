# SafeRoute Frontend (Expo + React Native)

Mobile app for SafeRoute route planning, safety-aware walking, and public transit guidance.

This app is built with:
- Expo SDK 54
- React Native 0.81
- Expo Router
- Mapbox (`@rnmapbox/maps`)
- Auth0 (`react-native-auth0`)

## Project Structure

- `./app` route screens and UI
- `./config/core-endpoints.ts` local/public API profile switch
- `./contexts/Auth0Context.tsx` authentication flow
- `./api` service wrappers
- `./assets` icons and images

## Prerequisites

- Node.js 20+
- npm 10+
- Xcode + iOS Simulator (for iOS development)
- A running SafeRoute backend (local or public)
- Valid Mapbox token and Auth0 settings

## Quick Start (iOS Local Development)

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Update required variables in `./.env`:
- `EXPO_PUBLIC_API_PROFILE`
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`
- `EXPO_PUBLIC_AUTH0_DOMAIN`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (if Google search/transit is used in your backend flow)

4. First-time native setup (or after native dependency changes):

```bash
npx expo run:ios
```

5. Start Metro (clean cache recommended):

```bash
npx expo start --dev-client --host localhost --clear
```

6. Launch app in simulator:
- Press `i` in Expo terminal, or
- Open Simulator and launch `saferouteapp` dev client manually.

## Backend Dependency

The app expects backend services on localhost in local mode (default profile).

Health endpoints typically used:
- `http://127.0.0.1:20000/health` (user management)
- `http://127.0.0.1:20001/health` (notification)
- `http://127.0.0.1:20002/health` (routing)
- `http://127.0.0.1:20004/health` (feedback)
- `http://127.0.0.1:20006/health` (sos)

If you need full local startup (backend + frontend + admin), follow:
- `../RUN_ALL_SERVICES.md`

## Environment Variables

Reference template: `./.env.example`

Main variables:
- `EXPO_PUBLIC_API_PROFILE=local|public`
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=...`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...`
- `EXPO_PUBLIC_AUTH0_DOMAIN=...`
- `EXPO_PUBLIC_API_BASE_URL=...`
- `EXPO_PUBLIC_USER_MANAGEMENT_HEALTH_URL=...`
- `EXPO_PUBLIC_NOTIFICATION_SERVICE_HEALTH_URL=...`
- `EXPO_PUBLIC_ROUTING_SERVICE_HEALTH_URL=...`
- `EXPO_PUBLIC_FEEDBACK_SERVICE_HEALTH_URL=...`
- `EXPO_PUBLIC_SOS_SERVICE_HEALTH_URL=...`

Important behavior:
- Endpoint resolution is profile-aware in `./config/core-endpoints.ts`.
- If `EXPO_PUBLIC_API_PROFILE` is explicitly set (`local` or `public`), profile defaults are used.
- If `EXPO_PUBLIC_API_PROFILE` is not set, specific endpoint env vars can override defaults.

## Useful Commands

```bash
# Start dev server
npm run start

# iOS build/run
npm run ios

# Android build/run
npm run android

# Lint
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Format code
npm run format
```

## Routing Behavior (Frontend Side)

- Walking:
  - Calls backend route API (`/v1/routes/calculate`).
  - Falls back to Mapbox geometry preview if needed.
- Public transit:
  - Calls `/v1/transit/plan`.
  - Falls back to walking route if transit itinerary is unavailable.

The mode switch and segmented route rendering happen in:
- `./app/(tabs)/index.tsx`

## Troubleshooting

### 1. App opens but API calls fail (`Network request failed`)

Check:
- Backend is running and reachable.
- `EXPO_PUBLIC_API_PROFILE` matches your environment.
- Health URLs in env are correct.

Quick check:

```bash
curl http://127.0.0.1:20002/health
```

### 2. Simulator shows stale UI

Use a full refresh:
- Restart Metro with `--clear`
- Restart Simulator
- Relaunch app

### 3. Map does not render

Check:
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` is valid.
- You are running iOS/Android dev client (not relying on unsupported web-only map flow).

### 4. Login/Auth0 errors

Check:
- `EXPO_PUBLIC_AUTH0_DOMAIN`
- Backend Auth0 audience/domain alignment

Also refer to:
- `./AUTH0_SETUP_GUIDE.md`
- `./AUTH0_CUSTOM_SIGNUP.md`

### 5. CI/lint failures

Run locally before pushing:

```bash
npm run lint
```

## Additional Docs

- `./MAPBOX_SETUP.md`
- `./AUTH0_SETUP_GUIDE.md`
- `./AUTH0_CUSTOM_SIGNUP.md`
- `./CI_SETUP.md`

## Notes

- Do not commit secrets from `./.env`.
- Keep public and local endpoint profiles consistent with backend deployment mode.
