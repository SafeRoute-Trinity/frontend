# SafeRoute Frontend

React Native / Expo mobile app for SafeRoute. Runs on iOS and Android. Provides safety-aware pedestrian navigation, real-time high-risk alerts, emergency SOS, and trusted contact management.

---

## Stack

| Technology | Version |
|---|---|
| Expo SDK | ~54.0.23 |
| React Native | 0.81.5 |
| React | 19.1.0 |
| TypeScript | ~5.9.2 |
| Expo Router | ~6.0.14 (file-based routing) |
| `@rnmapbox/maps` | ^10.2.7 |
| `react-native-auth0` | ^5.1.0 |
| `expo-secure-store` | ^15.0.7 |
| `expo-location` | ^19.0.7 |
| `react-native-reanimated` | ~4.1.1 |
| `react-native-maps` | 1.26.18 |
| `expo-crypto` | ~15.0.8 |
| `react-native-recaptcha-that-works` | 2.0.0 |

**State management** is handled via React Context (`Auth0Context.tsx`) and local component state. No external state library (Redux/Zustand) is used.

**New Architecture:** enabled. **React Compiler:** enabled. **Typed Routes:** enabled.

**Bundle IDs:** `com.anonymous.saferouteapp` (iOS and Android)

---

## Repository Structure

```
frontend/
├── app/
│   ├── _layout.tsx              # Root layout — Auth0 provider, theme
│   ├── (tabs)/
│   │   ├── index.tsx            # Main map screen (home tab)
│   │   ├── contacts.tsx         # Trusted contacts list
│   │   ├── alerts.tsx           # High-risk area alerts feed
│   │   ├── help.tsx             # Help and support
│   │   ├── profile.tsx          # User profile
│   │   ├── personal-info.tsx    # Edit personal info
│   │   └── add-contact.tsx      # Add trusted contact
│   ├── login.tsx                # Login screen
│   ├── register.tsx             # Registration screen
│   └── health.tsx               # Backend health check screen
├── api/
│   ├── client.ts                # HTTP client with auth token injection
│   ├── contacts.ts              # Trusted contacts API
│   ├── emergency.ts             # SOS / emergency endpoints
│   └── high-risk-alert.ts       # High-risk area alert API
├── config/
│   ├── api.ts                   # API base URL (platform-aware)
│   ├── auth0.ts                 # Auth0 domain, client ID, audience
│   ├── mapbox.ts                # Mapbox access token
│   └── core-endpoints.ts        # Named API endpoint paths
├── contexts/
│   └── Auth0Context.tsx         # Auth0 session context
├── services/
│   └── api-client.ts            # Singleton API client with interceptors
├── components/ui/               # Reusable UI primitives
│   ├── ContactCard.tsx
│   ├── GradientBackground.tsx
│   ├── SegmentedToggle.tsx
│   ├── Slider.tsx
│   └── Toggle.tsx
├── utils/
│   ├── device.ts                # Device info helpers
│   └── storage.ts               # Secure storage wrappers
├── constants/                   # Colours, sizes, theme values
├── assets/                      # Images, fonts, icons
├── app.json / app.config.ts     # Expo configuration
├── eas.json                     # EAS Build profiles
├── AUTH0_SETUP_GUIDE.md
├── MAPBOX_SETUP.md
└── CI_SETUP.md
```

---

## Getting Started

### Prerequisites

- Node.js >= 20 LTS
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (for production builds): `npm install -g eas-cli`
- Android Studio or Xcode for simulators (optional)

### Install

```bash
cd frontend
npm install
```

### Configure

**`config/api.ts`** — sets the backend base URL per platform:
- Android emulator: `http://10.0.2.2:20000`
- iOS / Web: `http://localhost:20000`
- Production: `EXPO_PUBLIC_API_URL` env var

**`config/auth0.ts`** — Auth0 credentials:
- Domain: `saferouteapp.eu.auth0.com` (override via env)
- Client ID: overridable via env var
- Audience: `EXPO_PUBLIC_AUTH0_AUDIENCE` env var

**`config/mapbox.ts`** — Mapbox public token. See `MAPBOX_SETUP.md`.

### Run

```bash
npx expo start
```

- Press `a` — Android emulator
- Press `i` — iOS simulator
- Scan QR — Expo Go on physical device
- Press `w` — web (limited, no native maps)

```bash
npm run android          # run directly on Android
npm run android:auto     # auto-start emulator then run
npm run ios
npm run web
```

---

## Authentication

Auth0 is used for authentication with two grant types:

- **OAuth / browser flow** — opens Auth0 Universal Login in a system browser (PKCE-safe for native)
- **Resource Owner Password** (`nativeLogin`) — direct username/password for native app flow

Tokens are stored encrypted via `expo-secure-store`. The `Auth0Context.tsx` provider wraps the root layout and restores the session from storage on app launch.

Available context methods: `login()`, `nativeLogin(username, password)`, `logout()`, `clearSession()`, `getAccessToken()`.

All API calls attach `Authorization: Bearer <token>` via the shared client in `services/api-client.ts`.

**Auth0 Callback URL** (must be registered in your Auth0 application): `saferoute://callback`

---

## Navigation

File-based routing via Expo Router. Unauthenticated users are redirected to `/login` by the root `_layout.tsx` guard.

| File | Route | Screen |
|---|---|---|
| `app/(tabs)/index.tsx` | `/` | Main map (home) |
| `app/(tabs)/contacts.tsx` | `/contacts` | Trusted contacts |
| `app/(tabs)/alerts.tsx` | `/alerts` | High-risk alerts |
| `app/(tabs)/help.tsx` | `/help` | Help |
| `app/(tabs)/profile.tsx` | `/profile` | Profile |
| `app/(tabs)/personal-info.tsx` | `/personal-info` | Edit personal info |
| `app/(tabs)/add-contact.tsx` | `/add-contact` | Add contact |
| `app/login.tsx` | `/login` | Login |
| `app/register.tsx` | `/register` | Register |
| `app/health.tsx` | `/health` | Backend health check |

---

## Main Map Screen

`app/(tabs)/index.tsx` is the core of the app:

- **Mapbox GL** renders the map (`@rnmapbox/maps`)
- **`expo-location`** tracks device GPS (foreground and background)
- Connects to the backend over both HTTPS (REST) and WebSocket (`wss://saferoutemap.duckdns.org`) via NGINX
- Route calculation calls `POST /v1/routes/calculate` on routing-service
- Transit planning calls `POST /v1/transit/plan` — routing-service proxies to Google Routes API and enriches walk legs with safety scores
- Safety-scored route overlays drawn as colour-coded GeoJSON line layers
- Feedback submission to `POST /v1/feedback/submit`
- High-risk area checks via `/api/high-risk-alert` — triggers alert banner when user enters a flagged zone within a 30m radius
- User safety weight preferences (CCTV, lighting, crime, pedestrian traffic) sent with route requests

---

## API Modules

| Module | Endpoints |
|---|---|
| `api/contacts.ts` | GET / POST / DELETE trusted contacts |
| `api/emergency.ts` | POST SOS trigger, GET SOS status |
| `api/high-risk-alert.ts` | GET high-risk area alerts near location |
| `api/client.ts` | Shared fetch wrapper with auth header |

SOS calls hit the `sos` service (port 20006 locally, same ingress path in production).

---

## Production Builds

```bash
eas login
eas build:configure   # first time only

# Android (APK/AAB)
eas build --platform android --profile production

# iOS (IPA)
eas build --platform ios --profile production
```

Build profiles are defined in `eas.json`.

### Local Android build (no EAS)

```bash
npx expo prebuild --platform android
npm run build
```

---

## Linting and Formatting

```bash
npm run lint         # ESLint
npm run lint:fix     # Auto-fix
npm run format       # Prettier
```

---

## Notes

- The active branch is **`master`** (not `main`)
- `expo-secure-store` only works on physical devices and emulators, not Expo Go web preview
- Mapbox requires a valid `MAPBOX_ACCESS_TOKEN` at native build time — see `MAPBOX_SETUP.md`
- Auth0 native module is lazy-loaded and only initialised on non-web platforms

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Blank map | Set Mapbox token in `config/mapbox.ts` and rebuild native |
| Auth0 redirect not returning | Register `saferoute://callback` in Auth0 dashboard |
| `expo-secure-store` error on web | Expected — native only |
| Location permission denied | Accept location prompt on device |
| API 401 | Token expired — call `logout()` then `login()` |
| Metro port conflict | `npx expo start --port 8082` |
| Android build fails | `npx expo prebuild --clean` then rebuild |
