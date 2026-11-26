# Android Distribution & Updates — Bright Cakes & Snacks

This document explains how Bright Cakes & Snacks is distributed as an Android APK
and how updates are delivered to customers.

## Overview

Two update mechanisms are implemented:

| Mechanism | Purpose | Delivery |
|-----------|---------|----------|
| **Expo OTA Updates** | JavaScript/UI improvements, bug fixes, compatible asset changes | Automatic download, applies on next launch |
| **Native APK Updates** | Native code changes, version bumps, breaking changes | GitHub Releases, manual install via APK |

Both mechanisms preserve the existing application package ID (`in.brightcakes.snacks`),
signing identity, and all local SQLite data.

---

## Prerequisites

Before the first release, you need:

1. **GitHub repository** — The source repository (`mhm.karthick/bright-cakes-snacks`)
   hosts the code and the GitHub Actions workflow. Releases are published to this
   repository.
2. **Production signing keystore** — The existing release signing identity must be
   preserved. All APKs must be signed with the same certificate to support updates
   over existing installations.
3. **Expo account** — The project is configured with Expo project ID
   `f3a7ed9d-c1b4-4e4e-9caa-8fdeb4334fc6` (owner: `mhm.karthick`).
4. **GitHub Actions secrets** — Configured in the repository settings:
   - `ANDROID_KEYSTORE_BASE64` — Base64-encoded production signing keystore
   - `ANDROID_KEYSTORE_PASSWORD` — Keystore password
   - `ANDROID_KEY_ALIAS` — Key alias
   - `ANDROID_KEY_PASSWORD` — Key password
   - `GITHUB_TOKEN` — Automatically provided by GitHub Actions

## Project Configuration

### app.json

The `app.json` includes:

- `android.package`: `in.brightcakes.snacks` (unchanged)
- `version`: `1.0.0` (incremented per release)
- `updates.channel`: `production`
- `updates.runtimeVersion.policy`: `appVersion`
- `updates.checkAutomatically`: `ON_LOAD`
- `expo-updates` plugin registered
- `expo-file-system` permissions for download and install

### withOfflineRelease plugin

The `plugins/withOfflineRelease.js` config plugin keeps `INTERNET` permission in
release builds (required for OTA updates and APK update checks) while removing
development-only permissions (`ACCESS_NETWORK_STATE`, `RECORD_AUDIO`,
`SYSTEM_ALERT_WINDOW`).

---

## Publishing an OTA Update

OTA updates deliver JavaScript and asset changes without requiring customers to
download a new APK. Use this for UI improvements, text changes, and bug fixes
that don't require native code changes.

### Command

```bash
# 1. Make your code changes
# 2. Verify TypeScript and tests pass
npx tsc --noEmit
npx jest --passWithNoTests

# 3. Publish to the production channel
eas update --channel production --message "Improved order management UI"

# 4. Verify the update was published
eas update:view --channel production
```

### Behaviour

1. On next launch, the app checks for compatible updates automatically.
2. If an update is available, it downloads in the background.
3. The current session continues uninterrupted.
4. The update applies on the next normal launch.
5. Updates are rejected if the runtime version is incompatible (native code
   changes require an APK release instead).

### Requirements

- You must be authenticated with `eas login` using the project owner account.
- The update must maintain runtime compatibility with the installed native build.
- No native code changes — if native code changes, publish an APK instead.

---

## Publishing a Native APK Release

Native APK releases are distributed through GitHub Releases. Use this for native
code changes, version bumps, or any change that breaks runtime compatibility.

### Command

```bash
# 1. Update version in app.json
# 2. Verify TypeScript and tests pass
npx tsc --noEmit
npx jest --passWithNoTests

# 3. Trigger the GitHub Actions workflow manually
#    Go to: https://github.com/mhm.karthick/bright-cakes-snacks/actions
#    Select: "Android Release" → "Run workflow"
#    Enter version name (e.g. 1.1.0) and release notes

# 4. Download the APK from the GitHub Releases page
#    https://github.com/mhm.karthick/bright-cakes-snacks/releases
```

### What the workflow does

1. Checks out the repository
2. Installs dependencies with `npm ci`
3. Runs TypeScript check and tests
4. Configures Android signing from GitHub secrets
5. Prebuilds Android with `expo prebuild`
6. Builds a signed release APK with Gradle
7. Verifies the APK exists and is signed
8. Calculates SHA-256 checksum
9. Creates a GitHub Release with the APK and checksum as assets
10. Cleans up signing credentials

### Release naming

APK: `Bright-Cakes-Snacks-vX.Y.Z.apk`
Checksum: `Bright-Cakes-Snacks-vX.Y.Z.apk.sha256`
Tag: `vX.Y.Z`

---

## Customer Installation

### Initial Install

1. Customer receives the APK download link (from GitHub Releases or shared directly).
2. Customer downloads `Bright-Cakes-Snacks-vX.Y.Z.apk`.
3. Android prompts to confirm installation from an unknown source.
4. Customer taps Install — no account, login, or cloud setup required.
5. App launches with the existing offline-first architecture.

### OTA Update

1. App launches and checks for compatible updates automatically.
2. If available, the update downloads in the background.
3. Customer continues using the app normally.
4. On next launch, the update is applied.
5. No customer action required.

### Native APK Update

1. App checks GitHub Releases on launch (respects 12-hour cooldown).
2. If a newer version is available, a dialog shows the new version and release notes.
3. Customer taps "Update Now" to download the APK.
4. Download progress is shown; SHA-256 is verified against release metadata.
5. Customer taps "Install Update" — Android's package installer opens.
6. Customer confirms installation in the system dialog.
7. App restarts with the new version; all data is preserved.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| APK installation blocked | Enable "Install unknown apps" for the source (browser or file manager) in Android settings |
| App says update is incompatible | Ensure the APK is signed with the same certificate as the installed version |
| APK signature mismatch | Re-sign with the production keystore; never use a different key |
| Download failure | Check internet connection; retry the download |
| GitHub API rate limit | Automatic checks use a 12-hour cooldown; manual checks may be rate-limited |
| Expo update unavailable | Check `eas update:list --channel production`; ensure you're on the production channel |
| Update not appearing after restart | OTA updates apply on next launch; restart the app completely |
| Version number not increasing | Update `version` in `app.json` before each native release |
| Android package installer failure | Ensure the APK is fully downloaded and the checksum matches |

---

## Security & Privacy

- Customer data remains in local SQLite — nothing is uploaded to GitHub or Expo.
- GitHub hosts only release artifacts (APK files) and release metadata.
- Expo Updates delivers only application code and assets.
- No privileged credentials are embedded in the application source code.
- The app works fully offline; online features are optional.
