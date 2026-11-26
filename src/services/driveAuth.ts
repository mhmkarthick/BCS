/**
 * Google Drive OAuth with PKCE.
 *
 * Handles authorization with Google Drive using the `drive.appdata` scope —
 * an app-specific, non-sensitive scope that does not require Google OAuth
 * verification. No application accounts are created; this is purely for
 * backup/restore access to the user's Google Drive appData folder.
 *
 * Tokens are stored in `expo-secure-store` and never written to source code.
 * Client IDs are configuration placeholders that must be set in Google Cloud
 * Console before the feature works at runtime.
 */

import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { nowStamp } from '../utils/format';

// ---------------------------------------------------------------------------
// Configuration — replace with your own Google Cloud Console credentials
// ---------------------------------------------------------------------------

/** iOS OAuth client ID from Google Cloud Console. */
const GOOGLE_CLIENT_ID_IOS =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';

/** Android OAuth client ID from Google Cloud Console. */
const GOOGLE_CLIENT_ID_ANDROID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ?? 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';

/** Narrowest appropriate Drive scope: app-specific storage only. */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

/** Google OAuth endpoints. */
const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';

// ---------------------------------------------------------------------------
// Secure store keys
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  accessToken: 'drive_access_token',
  refreshToken: 'drive_refresh_token',
  accountEmail: 'drive_account_email',
  accountName: 'drive_account_name',
  connectedAt: 'drive_connected_at',
} as const;

// ---------------------------------------------------------------------------
// WebBrowser setup (required for iOS OAuth redirects)
// ---------------------------------------------------------------------------

WebBrowser.maybeCompleteAuthSession();

// ---------------------------------------------------------------------------
// Auth request setup
// ---------------------------------------------------------------------------

const clientId = Platform.OS === 'ios' ? GOOGLE_CLIENT_ID_IOS : GOOGLE_CLIENT_ID_ANDROID;

const redirectUri = Platform.OS === 'ios'
  ? `com.googleusercontent.apps.${GOOGLE_CLIENT_ID_IOS.replace('.apps.googleusercontent.com', '')}:/oauth2redirect`
  : 'in.brightcakes.snacks:/oauth2redirect';

/**
 * Creates the auth request. `useAuthRequest` must be called inside a
 * component, so this module exports a factory plus helpers that operate on
 * the stored tokens directly.
 */
export function createAuthRequest() {
  return {
    authEndpoint: GOOGLE_AUTH_ENDPOINT,
    clientId,
    scopes: [DRIVE_SCOPE],
    redirectUri,
    extraParams: {
      access_type: 'offline', // request a refresh token
      prompt: 'consent', // force consent screen so we always get a refresh token
    },
  };
}

/** Returns whether we currently have stored Drive credentials. */
export async function hasDriveCredentials(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(STORAGE_KEYS.accessToken);
  return token !== null && token.length > 0;
}

/** Returns the connected account email, or null if not connected. */
export async function getConnectedAccount(): Promise<{
  email: string | null;
  name: string | null;
  connectedAt: string | null;
}> {
  const [email, name, connectedAt] = await Promise.all([
    SecureStore.getItemAsync(STORAGE_KEYS.accountEmail),
    SecureStore.getItemAsync(STORAGE_KEYS.accountName),
    SecureStore.getItemAsync(STORAGE_KEYS.connectedAt),
  ]);
  return { email, name, connectedAt };
}

/** Returns the stored access token, or null. */
export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.accessToken);
}

/** Returns the stored refresh token, or null. */
export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.refreshToken);
}

/**
 * Stores tokens and account info after a successful authorization.
 */
export async function storeCredentials(params: {
  accessToken: string;
  refreshToken?: string;
  email?: string;
  name?: string;
}): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.accessToken, params.accessToken);
  if (params.refreshToken) {
    await SecureStore.setItemAsync(STORAGE_KEYS.refreshToken, params.refreshToken);
  }
  if (params.email) {
    await SecureStore.setItemAsync(STORAGE_KEYS.accountEmail, params.email);
  }
  if (params.name) {
    await SecureStore.setItemAsync(STORAGE_KEYS.accountName, params.name);
  }
  await SecureStore.setItemAsync(STORAGE_KEYS.connectedAt, nowStamp());
}

/** Clears all stored Drive credentials. */
export async function clearCredentials(): Promise<void> {
  await Promise.all(
    Object.values(STORAGE_KEYS).map((k) => SecureStore.deleteItemAsync(k)),
  );
}

/**
 * Refreshes an expired access token using the refresh token.
 * Returns the new access token, or null if refresh failed.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (data.access_token) {
      await SecureStore.setItemAsync(STORAGE_KEYS.accessToken, data.access_token);
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

/** Revokes the current access token and clears local credentials. */
export async function revokeAccess(): Promise<void> {
  const token = await getAccessToken();
  if (token) {
    try {
      await fetch(GOOGLE_REVOKE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token }),
      });
    } catch {
      // Best effort — clear local credentials regardless.
    }
  }
  await clearCredentials();
}


