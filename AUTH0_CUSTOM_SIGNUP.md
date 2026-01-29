# Auth0 Custom Signup Configuration Guide

## Adding First Name, Last Name, and Password Confirmation

To add first name and last name fields, as well as password confirmation to your Auth0 signup flow, you need to configure it in the Auth0 Dashboard.

## Prerequisite: Check Your Universal Login Version

1. Log in to the [Auth0 Dashboard](https://manage.auth0.com/)
2. Navigate to **Branding** → **Universal Login**
3. Check the top of the page to confirm if you are using the **Classic** or **New** Universal Login Experience.

Choose the corresponding configuration method based on your version.

---

## ⭐ Recommended Method: Using Auth0 Actions (Applicable to All Versions)

This is the most flexible and modern approach, suitable for both Classic and New Universal Login.

### 1. Enable Custom Fields for Database Connection

1. Go to **Authentication** → **Database**
2. Click on your Database Connection (e.g., `Username-Password-Authentication`)
3. Go to the **Settings** tab
4. Find the **Requires Username** option (optional, if you need a username)
5. Save changes

### 2. Create Pre-User Registration Action

This Action will collect additional fields during user registration.

1. Navigate to **Actions** → **Library**
2. Click **+ Build Custom**
3. Create a new Action:
   - **Name**: `Add Custom Signup Fields`
   - **Trigger**: `Pre User Registration`
   - **Runtime**: Select the latest version

4. Use the following code:

```javascript
/**
 * Handler that will be called during Pre User Registration
 */
exports.onExecutePreUserRegistration = async (event, api) => {
  // Get custom fields from form data
  const firstName = event.request.body?.first_name || event.request.body?.given_name;
  const lastName = event.request.body?.last_name || event.request.body?.family_name;

  // Set user metadata
  if (firstName) {
    api.user.setUserMetadata('first_name', firstName);
  }

  if (lastName) {
    api.user.setUserMetadata('last_name', lastName);
  }

  // Optional: Set user's display name
  if (firstName && lastName) {
    api.user.setAppMetadata('full_name', `${firstName} ${lastName}`);
  }
};
```

5. Click **Deploy**
6. Go to **Actions** → **Flows** → **Pre User Registration**
7. Drag the newly created Action into the flow
8. Click **Apply**

### 3. Configure Registration Form Display Fields

#### If using New Universal Login:

1. Go to **Branding** → **Universal Login**
2. Click **Advanced Options**
3. In the **Signup** section, enable the **Prompt for Name** option
4. This will automatically show First Name and Last Name fields

Alternatively, use the API to configure:

```bash
# Using Auth0 Management API
curl -X PATCH 'https://YOUR_DOMAIN.auth0.com/api/v2/prompts/signup' \
  -H 'Authorization: Bearer YOUR_MANAGEMENT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "identifiers": ["email"],
    "attributes": {
      "name": {
        "required": true
      }
    }
  }'
```

#### If using Classic Universal Login (Lock Widget):

1. Go to **Branding** → **Universal Login**
2. Switch to the **Advanced** tab
3. Enable **Customize Login Page**
4. Find the Lock configuration in the template code and add:

```javascript
var lock = new Auth0Lock(config.clientID, config.auth0Domain, {
  // ... existing configuration

  additionalSignUpFields: [
    {
      name: 'first_name',
      placeholder: 'First Name',
      validator: function (firstName) {
        return {
          valid: firstName.length > 0,
          hint: 'First name is required',
        };
      },
    },
    {
      name: 'last_name',
      placeholder: 'Last Name',
      validator: function (lastName) {
        return {
          valid: lastName.length > 0,
          hint: 'Last name is required',
        };
      },
    },
  ],

  auth: {
    params: {
      scope: 'openid profile email',
    },
  },
});
```

5. Click **Save Changes**

### 4. Configure Password Policy

### 5. Configure Password Confirmation

**Password confirmation is built into Auth0**:

- Auth0's registration form requires users to enter their password twice by default.
- No additional configuration is needed; this is a standard security practice.

If you want to customize password validation rules:

1. Go to **Security** → **Attack Protection**
2. Configure **Brute Force Protection** and **Breached Password Detection**

---

## Quick Configuration Summary

### Simplest Method (Recommended):

1. **Enable New Universal Login**
   - Branding → Universal Login → Select "New"

2. **Enable Name Fields in Database Connection**
   - Authentication → Database → Click your connection
   - Settings → Ensure "Disable Sign Ups" is unchecked

3. **Configure Registration Form to Show Name Fields**
   - Branding → Universal Login → Click "Customize"
   - Enable "Prompt for Name" in the Signup form configuration

4. **Create Pre-User Registration Action**
   - Actions → Library → Build Custom
   - Use the code provided above to save first_name and last_name

5. **Test**
   - Clear browser cache
   - Try registering a new user
   - Verify that First Name and Last Name fields are displayed

## Retrieving User Information After Registration

After registration, you can retrieve complete user information via Auth0's `userInfo` endpoint:

```typescript
const userInfo = await auth0.auth.userInfo({
  token: credentials.accessToken,
});

// userInfo will contain:
// {
//   sub: "auth0|...",
//   email: "user@example.com",
//   name: "John Doe",
//   given_name: "John",  // first name
//   family_name: "Doe",  // last name
//   user_metadata: {
//     first_name: "John",
//     last_name: "Doe"
//   }
// }
```

## Testing Configuration

1. Clear app cache and Auth0 session
2. Reopen the registration page
3. Verify that first name and last name fields are displayed
4. Try submitting empty values to verify error messages
5. Enter mismatched passwords to verify the inconsistency prompt

## FAQ

### Q: Where is custom field data stored?

A: Auth0 stores custom fields in the user's `user_metadata`.

### Q: How do I access these fields in my backend API?

A: Include this information in JWT token claims, or query user information via the Auth0 Management API.

### Q: Where do I configure the password policy?

A: **Security** → **Database** → Select your Database Connection → **Password Policy**

### Q: How can I customize error messages?

A: Add custom messages in the `languageDictionary` of the Lock configuration, or modify the HTML template in Universal Login.

## Recommended Configuration

For production environments, we recommend:

1. Using **New Universal Login Experience** (modern and secure)
2. Configuring a strong password policy (at least 8 characters, including upper/lowercase and numbers)
3. Using **Actions** to handle additional registration logic
4. Enabling **Multi-Factor Authentication (MFA)** for enhanced security
