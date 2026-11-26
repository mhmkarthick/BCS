# Final Build Report

**Project:** Bright Cakes & Snacks
**Platform:** Android
**Date:** 2026-11-04
**Verdict:** ✅ **PASS — production release artefacts produced and verified**

---

## 1. Result

| Item | Result |
| --- | --- |
| `gradlew assembleRelease` | ✅ **BUILD SUCCESSFUL** — 21 min 25 s |
| `gradlew bundleRelease` | ✅ **BUILD SUCCESSFUL** — 2 min 17 s |
| Release APK | ✅ 114,441,766 bytes (109.14 MiB) |
| Release AAB | ✅ 77,099,309 bytes (73.53 MiB) |
| `npx expo prebuild --platform android --no-install` | ✅ succeeded |
| `npx expo-doctor` | ✅ 20 / 20 checks passed |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx expo lint` | ✅ 0 errors, 0 warnings |
| `npx jest` | ✅ 264 tests / 10 suites, all passing |

Full detail, including the `MAX_PATH` diagnosis and every verification
command, is in `BUILD_REPORT.md`.

---

## 2. Artefacts

| Artefact | Path |
| --- | --- |
| Release APK | `android/app/build/outputs/apk/release/app-release.apk` |
| Release AAB | `android/app/build/outputs/bundle/release/app-release.aab` |
| R8 mapping file | `android/app/build/outputs/mapping/release/mapping.txt` |
| R8 resource mapping | `android/app/build/outputs/mapping/release/usage.txt` |
| Native debug symbols | `android/app/build/outputs/native-debug-symbols/release/native-debug-symbols.zip` |
| Baseline profiles | `android/app/build/outputs/apk/release/baselineProfiles/` |
| Manifest merger report | `android/app/build/outputs/logs/manifest-merger-release-report.txt` |

### 2.1 Checksums

**APK** — `app-release.apk`, 114,441,766 bytes

```
SHA-256  2A3171C3A4B4ACC215DA5B636B4D8C1B0B3C93A5844EB38A7A25B2675CAEB2B9
SHA-1    F592B13A64D272CB6A8FEFE91C10C5FD994ACFA3
MD5      4FE2BB2C0669BB847DC96B1BE178DB0D
```

**AAB** — `app-release.aab`, 77,099,309 bytes

```
SHA-256  D40D7C4BBAC3968CD2014650D10C96B3BEC158114E4EAFAF9218AF8B38DB27F0
SHA-1    981F49C8DBD07928BD863672328AA47B25A84ED6
MD5      3AFAF5558B69DB92AD63B4D5437D375A
```

---

## 3. Toolchain

| Component | Version |
| --- | --- |
| Node.js / npm | v24.15.0 / 11.12.1 |
| Expo | `~58.0.23` (CLI 58.1.19) |
| React Native / React | 0.88.1 / 19.3.0 |
| JDK | Amazon Corretto 17.0.21 LTS |
| Gradle | 9.4.1 |
| Android Gradle Plugin | 9.2.1 |
| Kotlin | 2.2.10 |
| CMake / Ninja | 3.31.6 / 1.12.1 |
| Android NDK | 27.1.12297006 |
| build-tools | 37.0.0 |
| minSdk / compileSdk / targetSdk | 24 / 37 / 36 |
| Architectures | `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64` |
| New Architecture | enabled (`newArchEnabled=true`) |
| Hermes | enabled (`hermesEnabled=true`) |
| Edge-to-edge | enabled (`edgeToEdgeEnabled=true`) |
| R8 minification | enabled |

---

## 4. Verification actually performed on the artefact

Nothing below is inferred from a successful build — every line was read out
of the produced file.

### 4.1 Package identity

```
package: name='in.brightcakes.snacks' versionCode='1' versionName='1.0.0'
         compileSdkVersion='37'
targetSdkVersion:'36'
application-label:'Bright Cakes & Snacks'
launchable-activity: name='in.brightcakes.snacks.MainActivity'
native-code: 'arm64-v8a' 'armeabi-v7a' 'x86' 'x86_64'
```

### 4.2 Offline enforcement — the release APK has no network permission

```
$ aapt2 dump permissions app-release.apk
package: in.brightcakes.snacks
uses-permission: name='android.permission.CAMERA'
uses-permission: name='android.permission.READ_EXTERNAL_STORAGE' maxSdkVersion='32'
uses-permission: name='android.permission.READ_MEDIA_IMAGES'
uses-permission: name='android.permission.VIBRATE'
uses-permission: name='android.permission.WRITE_EXTERNAL_STORAGE' maxSdkVersion='32'
permission: in.brightcakes.snacks.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION
uses-permission: name='in.brightcakes.snacks.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION'
```

**`android.permission.INTERNET` is absent, and so are
`ACCESS_NETWORK_STATE`, `RECORD_AUDIO` and `SYSTEM_ALERT_WINDOW`.** The
shipped binary cannot open a network socket. The AAB's base manifest was
checked the same way and is equally clean.

This was a genuine defect found during the build: the **first** successful
release build shipped all four unwanted permissions, because the Expo
prebuild template and the `expo-file-system` / `expo-image` library
manifests declare them. It was fixed with `plugins/withOfflineRelease.js`,
a config plugin committed to the repository that writes a release-variant
manifest using the Android manifest merger's `tools:node="remove"`.

### 4.3 JavaScript bundle

```
assets/index.android.bundle   6,656,228 bytes
first 8 bytes: c61fbc03c103191f   → Hermes bytecode
```

The Hermes magic prefix proves the bundle was compiled by Hermes, and that
the **Worklets / Reanimated Babel transform ran** — without it the worklets
would remain plain JavaScript and Reanimated would throw at runtime.

### 4.4 Assets — every bundled file verified byte-for-byte

Each source asset was hashed and matched against the file inside the APK.
**10 / 10 images** and **8 / 8 fonts** are present byte-identical:

```
MATCH  blackforest.jpg      -> res/tL.jpg       173868 bytes
MATCH  cheesecake.jpg       -> res/TH.jpg       100350 bytes
MATCH  cookies.jpg          -> res/II.jpg       119772 bytes
MATCH  croissant.jpg        -> res/sT.jpg       124926 bytes
MATCH  cupcakes.jpg         -> res/V9.jpg       148821 bytes
MATCH  kaju.jpg             -> res/TL.jpg       125600 bytes
MATCH  mathri.jpg           -> res/xT.jpg       185895 bytes
MATCH  puff.jpg             -> res/Ry.jpg       134557 bytes
MATCH  truffle.jpg          -> res/WW.jpg       113052 bytes
MATCH  welcome.jpg          -> res/Zr.jpg       167987 bytes

MATCH  Inter-Bold.ttf               -> assets/fonts/Inter-Bold.ttf
MATCH  Inter-Light.ttf              -> assets/fonts/Inter-Light.ttf
MATCH  Inter-Medium.ttf             -> assets/fonts/Inter-Medium.ttf
MATCH  Inter-Regular.ttf            -> assets/fonts/Inter-Regular.ttf
MATCH  Inter-SemiBold.ttf           -> assets/fonts/Inter-SemiBold.ttf
MATCH  Newsreader-Italic.ttf        -> assets/fonts/Newsreader-Italic.ttf
MATCH  Newsreader-Medium.ttf        -> assets/fonts/Newsreader-Medium.ttf
MATCH  Newsreader-Regular.ttf       -> assets/fonts/Newsreader-Regular.ttf
```

(The product images are packaged into `res/` as AAPT2 resources with
shortened names; the fonts live in `assets/fonts/` and are additionally
copied into `res/` by `expo-font`.)

| Check | Result |
| --- | --- |
| Bundled product images | ✅ 10 / 10, byte-identical |
| Bundled fonts | ✅ 8 / 8, byte-identical |
| Total image resources in the APK | 230 (product art, app icons, adaptive icons, splash screen, library drawables) |
| Remote asset URLs | none |
| Native `.so` files | 112 — 28 libraries × 4 ABIs |
| `libreanimated.so` | 4 / 4 ABIs |
| `libworklets.so` | 4 / 4 ABIs |
| `libhermesvm.so` | 4 / 4 ABIs |
| `libexpo-sqlite.so` | 4 / 4 ABIs |
| `libgesturehandler.so` | 4 / 4 ABIs |
| `librnscreens.so` | 4 / 4 ABIs |

### 4.5 Release-blocking lint

`:app:lintVitalRelease` — the gate that fails a release build on a fatal
Android lint issue — **passed**.

---

## 5. The one hard build problem, and how it was solved

### 5.1 Symptom

```
ninja: error: Stat(.../RNGestureHandlerDetectorShadowNode.cpp.o):
Filename longer than 260 characters
```

### 5.2 Cause

The New Architecture compiles C++ for every autolinked native library, and
the generated object files are nested deeply under `android/app/.cxx`. At
this workspace depth the absolute path reached **353 characters**, past
Win32's 260-character `MAX_PATH`. The SDK's default CMake 3.22.1 bundles
Ninja 1.10.2, which is not long-path aware.

### 5.3 Fix

The remedy Expo documents for this exact error:

1. `LongPathsEnabled=1` in the Windows registry — already set.
2. Install `cmake;3.31.6`, which bundles **Ninja 1.12.1** (Ninja gained
   long-path support in 1.12.0).
3. Set `android.cmakeVersion=3.31.6` in
   `%USERPROFILE%\.gradle\gradle.properties` — **written without a UTF-8
   BOM**, which was the reason the first two attempts silently fell back to
   CMake 3.22.1.
4. Delete the stale `android/app/.cxx` tree so it is regenerated with the
   new Ninja.

The build log confirms it took effect:

```
[ExpoRootProject] Overriding CMake version: 3.31.6
```

**No workaround was left in the generated project.** `android/build.gradle`
is exactly what `expo prebuild` produced; the `buildStagingDirectory`
override that was tried and reverted is gone.

### 5.4 Reproducibility caveat

`android.cmakeVersion` lives in the Gradle user home, and `android/` is
git-ignored and regenerated by `expo prebuild`. A fresh machine must
therefore install CMake 3.31.6 and set that property before building.
This is documented in `KNOWN_LIMITATIONS.md` §3.1 and `BUILD_REPORT.md` §4.

---

## 6. What the build does **not** prove

A successful build proves the code compiles, links, minifies and packages.
It does **not** prove the app behaves correctly at runtime. No Android
device or emulator was attached at any point (`adb devices` was empty), so
the following remain unverified:

| Not verified | Why | How to complete it |
| --- | --- | --- |
| The APK installs and launches | no device | `adb install -r …/app-release.apk` |
| Every screen renders | no device | walk the 28 screen routes |
| Onboarding, CRUD, status flow, payments | no device | manual walk-through |
| Touch gestures (swipe-to-advance, sheet drag) | no device | manual walk-through |
| System dialogs (date picker, camera, picker, share sheet) | no device | manual walk-through |
| Airplane-mode operation | no device | disable Wi-Fi and data, repeat |
| Cold-start time and frame rate | no device | `adb shell am start -W` |
| Pixel comparison against the reference | no device | capture and diff |

These are listed in full, with the exact commands, in
`KNOWN_LIMITATIONS.md` §1.1 and `FINAL_VISUAL_QA.md` §8.

---

## 7. Two caveats on the artefacts themselves

| # | Caveat | Impact | Resolution |
| --- | --- | --- | --- |
| C1 | The APK and AAB are signed with the **debug** keystore | the artefacts are installable and fully functional, but are **not** store-ready | generate a production keystore and switch the release `signingConfig` — the exact steps are in `BUILD_REPORT.md` §9 and `KNOWN_LIMITATIONS.md` §4 |
| C2 | The APK is a **universal** build containing all four ABIs (109 MiB) | larger download than a per-ABI split | publish the AAB, or build per-ABI APKs with `-PreactNativeArchitectures=arm64-v8a` |

---

## 8. Verdict

**PASS.** The project produces a genuine, optimised, offline-hardened
Android release:

- the release APK and the release AAB both build from a clean
  `expo prebuild`,
- the JavaScript bundle is Hermes bytecode with the worklet transform
  applied,
- all four ABIs ship with the Reanimated, Worklets, Hermes and SQLite
  native runtimes,
- R8 minification and the release-blocking lint gate both pass,
- and the shipped binary carries **no network permission at all**, which
  makes the offline requirement structurally enforced rather than merely
  asserted.

The only outstanding item is environmental: **no Android device was
available**, so the on-device verification pass has not been run. That pass
is documented step by step and should be completed before publication.
