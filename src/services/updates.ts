/**
 * Bright Cakes & Snacks — Native APK update checker.
 *
 * Checks GitHub Releases for a newer native APK build, downloads it,
 * verifies its SHA-256 checksum against release metadata, and hands off to
 * Android's package installer for the user to complete installation.
 *
 * This is separate from Expo OTA updates (expo-updates), which deliver
 * JavaScript/asset updates automatically.
 *
 * Android limitation: an ordinary third-party app cannot silently install an
 * APK. The user must always confirm installation via the system package
 * installer. This service downloads the APK, verifies its integrity, and
 * launches the installer; the user taps Install.
 *
 * The app continues working normally if GitHub is unreachable or no update
 * exists. No customer data is uploaded anywhere.
 */

import { Paths, File, Directory, type DownloadOptions, type DownloadProgress } from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

/** Public GitHub Releases API endpoint for the Bright Cakes & Snacks repo. */
const GITHUB_RELEASES_API =
  'https://api.github.com/repos/mhmkarthick/BCS/releases/latest';

/** Persisted update-check state key in SecureStore. */
const LAST_CHECK_KEY = 'update_last_check_ms';

/** Cooldown between automatic checks: 12 hours. */
const CHECK_COOLDOWN_MS = 12 * 60 * 60 * 1000;

/** Download directory for APK files. */
const DOWNLOAD_DIR = Paths.cache.uri;

/**
 * Parses a semantic version string into comparable numeric parts.
 * Returns null for invalid versions.
 */
function parseSemver(version: string): { major: number; minor: number; patch: number } | null {
  const clean = version.replace(/^v/i, '');
  const match = clean.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

/** Returns true if `a` is strictly newer than `b`. */
function isNewer(a: string, b: string): boolean {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return false;
  if (pa.major !== pb.major) return pa.major > pb.major;
  if (pa.minor !== pb.minor) return pa.minor > pb.minor;
  return pa.patch > pb.patch;
}

/** Shape of a GitHub release (subset we care about). */
interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
  assets: {
    name: string;
    browser_download_url: string;
    size: number;
  }[];
}

/** Shape of stored release metadata. */
export interface StoredRelease {
  version: string;
  releaseNotes: string;
  publishedAt: string;
  apkUrl: string;
  sha256?: string;
}

/**
 * Reads the currently installed app version from Expo Constants.
 * Falls back to app.json version if unavailable.
 */
export function getInstalledVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const expoConstants = require('expo-constants');
    const manifest = expoConstants.expoConfig ?? expoConstants.manifest;
    const version = manifest?.version;
    if (version) return String(version);
  } catch {
    // ignore
  }
  return '1.0.0';
}

/**
 * Ensures the download directory exists.
 */
async function ensureDownloadDir(): Promise<void> {
  try {
    const cacheDir = new Directory(Paths.cache, 'updates');
    cacheDir.create();
  } catch {
    // Directory may already exist — that's fine.
  }
}

/**
 * Computes the SHA-256 digest of a local file as a lowercase hexadecimal string.
 */
async function sha256OfFile(file: File): Promise<string> {
  return file.digest('SHA-256');
}

/**
 * Checks GitHub Releases for a newer version than the currently installed one.
 *
 * Returns release info if an update is available, null otherwise.
 * Never throws — returns null on any error so the app keeps working.
 */
export async function checkForUpdate(): Promise<StoredRelease | null> {
  if (Platform.OS !== 'android') return null;

  try {
    const response = await fetch(GITHUB_RELEASES_API, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) return null;

    const release: GitHubRelease = await response.json();
    if (release.draft || release.prerelease) return null;

    const latestVersion = release.tag_name.replace(/^v/i, '');
    const installed = getInstalledVersion();

    if (!isNewer(latestVersion, installed)) return null;

    const apkAsset = release.assets.find((a) =>
      a.name.startsWith(`Bright-Cakes-Snacks-v${latestVersion}`) &&
      a.name.endsWith('.apk'),
    );
    if (!apkAsset) return null;

    // Find the accompanying SHA-256 checksum asset.
    const checksumAsset = release.assets.find(
      (a) =>
        a.name.startsWith(`Bright-Cakes-Snacks-v${latestVersion}`) &&
        a.name.endsWith('.apk.sha256'),
    );

    let sha256: string | undefined;
    if (checksumAsset) {
      try {
        const checksumResponse = await fetch(checksumAsset.browser_download_url);
        if (checksumResponse.ok) {
          const checksumText = await checksumResponse.text();
          // SHA-256 checksum files typically contain: "<hash>  <filename>"
          const match = checksumText.match(/^[0-9a-fA-F]{64}/);
          if (match) {
            sha256 = match[0].toLowerCase();
          }
        }
      } catch {
        // Checksum fetch failed — continue without it, installation will be blocked.
      }
    }

    const stored: StoredRelease = {
      version: latestVersion,
      releaseNotes: release.body || 'No release notes provided.',
      publishedAt: release.published_at,
      apkUrl: apkAsset.browser_download_url,
      ...(sha256 ? { sha256 } : {}),
    };

    return stored;
  } catch {
    return null;
  }
}

/**
 * Verifies that the downloaded APK's SHA-256 matches the expected checksum.
 * Returns true if verification passes or if no checksum was provided (trust on
 * first use is not acceptable — caller should treat missing checksum as a
 * hard failure).
 */
export async function verifyApkChecksum(
  fileUri: string,
  expectedSha256?: string,
): Promise<boolean> {
  // If no checksum was provided in release metadata, we cannot verify integrity.
  // Fail closed: do not allow installation of an unverified APK.
  if (!expectedSha256) {
    return false;
  }

  try {
    const file = new File(Paths.cache, fileUri.replace(DOWNLOAD_DIR, ''));
    const actual = await sha256OfFile(file);
    return actual.toLowerCase() === expectedSha256.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Determines whether an automatic check is due based on the cooldown.
 */
export async function isCheckDue(): Promise<boolean> {
  try {
    const { ExpoSecureStore } = require('expo-secure-store'); // eslint-disable-line @typescript-eslint/no-require-imports
    const last = await ExpoSecureStore.getItemAsync(LAST_CHECK_KEY);
    if (!last) return true;
    const lastMs = Number(last);
    if (Number.isNaN(lastMs)) return true;
    return Date.now() - lastMs > CHECK_COOLDOWN_MS;
  } catch {
    return true;
  }
}

/**
 * Records the timestamp of the last update check.
 */
export async function recordCheckTime(): Promise<void> {
  try {
    const { ExpoSecureStore } = require('expo-secure-store'); // eslint-disable-line @typescript-eslint/no-require-imports
    await ExpoSecureStore.setItemAsync(LAST_CHECK_KEY, String(Date.now()));
  } catch {
    // ignore — non-critical
  }
}

/**
 * Downloads an APK to the app cache and returns the local file URI.
 *
 * Does NOT verify SHA-256 here — callers must call verifyApkChecksum before
 * allowing installation.
 */
export async function downloadApk(
  release: StoredRelease,
  onProgress?: (received: number, total: number) => void,
): Promise<string> {
  await ensureDownloadDir();

  const fileName = `Bright-Cakes-Snacks-v${release.version}.apk`;
  const dest = `${DOWNLOAD_DIR}${fileName}`;

  const destination = new File(Paths.cache, fileName);
  const opts: DownloadOptions = {
    idempotent: true,
    onProgress: (data: DownloadProgress) => {
      if (onProgress) {
        onProgress(data.bytesWritten, data.totalBytes);
      }
    },
  };

  await File.downloadFileAsync(release.apkUrl, destination, opts);

  return dest;
}

/**
 * Opens Android's package installer for the downloaded APK.
 * The user must confirm installation.
 *
 * Only call this after verifyApkChecksum has returned true.
 */
export async function installApk(fileUri: string): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    const file = new File(Paths.cache, fileUri.replace(DOWNLOAD_DIR, ''));
    const contentUri = file.contentUri;
    const url = contentUri;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return true;
    }

    // Fall back to WebBrowser which may hand off to the package installer.
    await WebBrowser.openBrowserAsync(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes a downloaded APK from cache.
 */
export async function deleteApk(fileUri: string): Promise<void> {
  try {
    const file = new File(Paths.cache, fileUri.replace(DOWNLOAD_DIR, ''));
    if (file.exists) {
      file.delete();
    }
  } catch {
    // ignore
  }
}

/**
 * Legacy wrapper: checks for update, respecting cooldown.
 * Returns null if check is not due or no update available.
 */
export async function checkForUpdateIfDue(): Promise<StoredRelease | null> {
  const due = await isCheckDue();
  if (!due) return null;
  const release = await checkForUpdate();
  await recordCheckTime();
  return release;
}
