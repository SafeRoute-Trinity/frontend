# Auth0 End-to-End Setup Guide

This guide provides the necessary steps to configure your Auth0 tenant to work with the custom login and registration screens in the SafeRoute application.

## 1. Auth0 Dashboard: Create Application

1.  Log in to the [Auth0 Dashboard](https://manage.auth0.com/).
2.  Go to **Applications** → **Applications** and click **Create Application**.
3.  Name it `SafeRoute Mobile` and select **Native**.
4.  In the **Settings** tab:
    - **Domain**: Copy this to your `.env` as `EXPO_PUBLIC_AUTH0_DOMAIN`.
    - **Client ID**: Copy this to your `.env` as `EXPO_PUBLIC_AUTH0_CLIENT_ID`.
    - **Allowed Callback URLs**: `saferouteapp://auth/callback`
    - **Allowed Logout URLs**: `saferouteapp://auth/callback`
    - **Allowed Web Origins**: (Leave empty for mobile)
5.  Scroll down to **Advanced Settings** → **Grant Types**:
    > [!IMPORTANT]
    > Ensure **Resource Owner Password** is checked. This is required for the `nativeLogin` functionality used in the custom login screen.
6.  Click **Save Changes**.

## 2. Database Connection Configuration

1.  Go to **Authentication** → **Database**.
2.  Click on `Username-Password-Authentication` (or your specific connection).
3.  In the **Settings** tab:
    - Ensure **Disable Signups** is OFF.
4.  (Optional) Go to the **Password Policy** tab to adjust complexity requirements.

## 3. Auth0 Actions: Custom Registration Fields

Since the custom registration form collects `first_name` and `last_name`, you need an Auth0 Action to save these to the user profile.

1.  Go to **Actions** → **Library** and click **Build Custom**.
2.  **Name**: `Handle Custom Signup Metadata`
3.  **Trigger**: `Pre User Registration`
4.  **Runtime**: Same as default (Node 18 or later).
5.  Use the following code:

```javascript
exports.onExecutePreUserRegistration = async (event, api) => {
  // Extract custom fields from the registration request metadata
  const firstName = event.user.user_metadata?.first_name;
  const lastName = event.user.user_metadata?.last_name;

  // You can also set these as root attributes if needed
  if (firstName) {
    api.user.setUserMetadata('first_name', firstName);
  }
  if (lastName) {
    api.user.setUserMetadata('last_name', lastName);
  }
};
```

6.  Click **Deploy**.
7.  Go to **Actions** → **Flows** → **Pre User Registration**.
8.  Drag your `Handle Custom Signup Metadata` action into the flow and click **Apply**.

## 4. Local Environment Setup

Create or update your `.env` file in the root directory:

```env
EXPO_PUBLIC_AUTH0_DOMAIN=your-tenant.auth0.com
EXPO_PUBLIC_AUTH0_CLIENT_ID=your-client-id
```

## 5. Code Implementation Overview

### Custom Login (`app/login.tsx`)

Uses the `nativeLogin` function from `Auth0Context.tsx`. This calls the `/oauth/token` endpoint with `grant_type: 'password'`.

### Custom Registration (`app/register.tsx`)

Calls the `/dbconnections/signup` endpoint directly. This sends the `user_metadata` including `first_name` and `last_name`.

### Auth0 Context (`contexts/Auth0Context.tsx`)

The `Auth0Provider` manages the user state and provides `nativeLogin`, `login` (WebAuth), and `logout` functions. It uses `expo-secure-store` to persist tokens and user data.

## 6. Configure Auth0 API (Optional but Recommended)

To receive JWT access tokens (instead of opaque tokens) with custom claims, you need to create an API in Auth0.

### Create an API

1.  Go to **Applications** → **APIs** in the Auth0 Dashboard
2.  Click **Create API**
3.  **Name**: `SafeRoute API` (or any name you prefer)
4.  **Identifier**: `https://saferoute.com/api` (this is your API audience)
    > [!IMPORTANT]
    > The identifier can be any URL format but doesn't need to be a real URL. It's just a unique identifier.
5.  **Signing Algorithm**: `RS256`
6.  Click **Create**

### Update Your Code to Use the Audience

Modify the `nativeLogin` function in [contexts/Auth0Context.tsx](file:///c:/frontend/contexts/Auth0Context.tsx) to include the `audience` parameter:

```typescript
body: JSON.stringify({
  grant_type: 'password',
  username: email.trim(),
  password: password,
  client_id: auth0Config.clientId,
  scope: 'openid profile email offline_access',
  realm: 'Username-Password-Authentication',
  audience: 'https://saferoute.com/api', // Add this line
}),
```

### Why This Matters

- **Without audience**: Auth0 returns opaque tokens (random strings) that cannot be decoded
- **With audience**: Auth0 returns JWT tokens that can be decoded to see custom claims from your Post Login Action

## 7. Verification

1.  **Restart the development server**: `npx expo start -c`
2.  **Test Registration**: Go to the Register screen, fill in all fields (including First/Last Name), and submit. Check the Auth0 Dashboard → Users to see if the user was created with the correct `user_metadata`.
3.  **Test Login**: Use the newly created credentials to log in on the Login screen.
