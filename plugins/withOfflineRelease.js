/**
 * Offline release hardening.
 *
 * The Expo prebuild template grants a set of permissions in
 * `android/app/src/main/AndroidManifest.xml` that are only meaningful for
 * local development:
 *
 *   android.permission.ACCESS_NETWORK_STATE
 *                                        — connectivity probing, contributed
 *                                        by `expo-file-system` and
 *                                        `expo-image` for their optional
 *                                        remote-URL features.
 *   android.permission.RECORD_AUDIO      — not used by any module in this app.
 *   android.permission.SYSTEM_ALERT_WINDOW — the React Native dev-menu overlay.
 *
 * `android.permission.INTERNET` is intentionally KEPT in the release variant
 * because the app uses it for optional online features:
 *
 *   - Expo OTA updates (expo-updates) check for and download compatible
 *     JavaScript/asset updates.
 *   - The native APK update checker contacts GitHub Releases to learn about
 *     new native builds.
 *
 * The app remains offline-first: every screen, calculation and database
 * operation works without a network connection. Online features are purely
 * optional and degrade gracefully when the device is offline.
 *
 * This plugin writes a release-variant manifest that removes the development
 * permissions with the Android manifest merger's `tools:node="remove"`
 * directive. Because the override lives in `src/release/`, it applies only to
 * the release variant:
 *
 *   release → ACCESS_NETWORK_STATE, RECORD_AUDIO, SYSTEM_ALERT_WINDOW removed
 *   debug   → untouched, so `expo start` + Metro still works on a device
 *
 * The permissions the app genuinely needs are left in place:
 *
 *   INTERNET              — expo-updates OTA checks and GitHub release checks
 *   CAMERA              — expo-image-picker (product photos, receipts)
 *   READ_MEDIA_IMAGES   — expo-image-picker gallery access on API 33+
 *   READ_EXTERNAL_STORAGE / WRITE_EXTERNAL_STORAGE (maxSdkVersion 32)
 *                       — expo-image-picker / expo-file-system on older devices
 *   VIBRATE             — expo-haptics
 *
 * The plugin is intentionally written into the repository so that a clean
 * `npx expo prebuild --clean` reproduces the hardened manifest. No manual
 * edit of the generated `android/` tree is required.
 */

const { withDangerousMod } = require('expo/config-plugins');

/**
 * Release-variant AndroidManifest overlay.
 *
 * Removes development-only permissions from the release build while keeping
 * INTERNET for optional online features (OTA updates, APK update checks).
 */
const RELEASE_MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

  <!-- Kept: required by expo-updates OTA and GitHub APK update checks -->
  <!-- android.permission.INTERNET intentionally NOT removed -->

  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" tools:node="remove"/>
  <uses-permission android:name="android.permission.RECORD_AUDIO" tools:node="remove"/>
  <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" tools:node="remove"/>

</manifest>
`;

/** @type {import('expo/config-plugins').ConfigPlugin} */
function withOfflineRelease(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const { platformProjectRoot } = config.modRequest;
      const releaseDir = `${platformProjectRoot}/app/src/release`;
      const fs = require('fs');
      const path = require('path');

      if (!fs.existsSync(releaseDir)) {
        fs.mkdirSync(releaseDir, { recursive: true });
      }

      fs.writeFileSync(path.join(releaseDir, 'AndroidManifest.xml'), RELEASE_MANIFEST, 'utf8');

      return config;
    },
  ]);
}

module.exports = withOfflineRelease;
