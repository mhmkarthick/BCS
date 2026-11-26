# Android Release Checklist — Bright Cakes & Snacks

Use this checklist for every production APK release. Complete all items before
publishing.

## Pre-Release

- [ ] Code changes are complete and reviewed
- [ ] Version updated in `app.json` (semantic versioning: `X.Y.Z`)
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npx eslint .` passes (no new errors)
- [ ] `npx jest --passWithNoTests` passes — all tests green
- [ ] Existing functionality is preserved (no regressions)
- [ ] No customer data, orders, or payments are modified
- [ ] No new mandatory authentication or login screens

## Signing

- [ ] Production signing keystore is available (not a new key)
- [ ] Keystore password, key alias, and key password are known
- [ ] Keystore is NOT committed to the repository
- [ ] GitHub secrets are configured:
  - [ ] `ANDROID_KEYSTORE_BASE64`
  - [ ] `ANDROID_KEYSTORE_PASSWORD`
  - [ ] `ANDROID_KEY_ALIAS`
  - [ ] `ANDROID_KEY_PASSWORD`

## Build

- [ ] `npx expo prebuild --platform android --clean` completes
- [ ] `./gradlew :app:assembleRelease` builds a signed APK
- [ ] APK exists at `android/app/build/outputs/apk/release/app-release.apk`
- [ ] APK package ID matches `in.brightcakes.snacks`
- [ ] APK version code increases from previous release
- [ ] APK version name matches `app.json` version
- [ ] APK signature is valid (`apksigner verify --print-certs`)
- [ ] Signing certificate matches the existing production identity

## Release

- [ ] GitHub Actions workflow triggered manually (workflow_dispatch)
- [ ] Version name entered correctly (e.g. `1.1.0`)
- [ ] Release notes are accurate and complete
- [ ] GitHub Release created with tag `vX.Y.Z`
- [ ] APK uploaded as release asset: `Bright-Cakes-Snacks-vX.Y.Z.apk`
- [ ] SHA-256 checksum uploaded: `Bright-Cakes-Snacks-vX.Y.Z.apk.sha256`
- [ ] Release is published (not draft)

## Post-Release

- [ ] APK downloads successfully from GitHub Releases
- [ ] APK installs over the previous version (data preserved)
- [ ] App launches and functions correctly after install
- [ ] OTA update channel still works for compatible JS updates
- [ ] Update checker dialog shows correct version comparison
- [ ] Release notes are visible to customers

## Version Compatibility

- [ ] OTA updates only (no native changes): version code unchanged, publish via `eas update`
- [ ] Native changes (new version): version code increased, publish via APK workflow
- [ ] Breaking native changes: major version bump, APK required
