import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { uid } from './format';

/**
 * File helpers.
 *
 * Everything the app writes stays **on the device**: exports are produced in
 * the cache directory and handed to the system share sheet, and photos are
 * copied into the app's document directory so they survive the cache being
 * cleared by the OS.
 *
 * No network access is involved at any point.
 */

/** Directory holding user-supplied photos. */
function mediaDirectory(): Directory {
  const dir = new Directory(Paths.document, 'media');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/**
 * Opens the photo library and copies the chosen image into the app's
 * document directory.
 *
 * @returns a persistent `file://` URI, or `null` when the user cancelled.
 */
export async function pickImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library access is needed to attach a picture.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.82,
    allowsMultipleSelection: false,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) return null;

  return persistImage(result.assets[0].uri, result.assets[0].fileName);
}

/**
 * Opens the camera and copies the captured photo into the app's document
 * directory.
 *
 * @returns a persistent `file://` URI, or `null` when the user cancelled.
 */
export async function captureImage(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera access is needed to photograph a receipt.');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.82,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) return null;

  return persistImage(result.assets[0].uri, result.assets[0].fileName);
}

/** Copies an image URI into the app's private media directory. */
async function persistImage(
  uri: string,
  fileName?: string | null,
): Promise<string> {
  const source = new File(uri);
  if (!source.exists) throw new Error('That image could not be read.');

  const extension = fileName?.split('.').pop()?.toLowerCase() ?? 'jpg';
  const target = new File(mediaDirectory(), `${uid('img')}.${extension}`);
  await source.copy(target);
  return target.uri;
}

/** Writes a text file into the cache directory and returns it. */
export async function writeTextFile(
  fileName: string,
  content: string,
): Promise<File> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  await file.write(content);
  return file;
}

/**
 * Hands a file to the system share sheet so the user can save it, mail it or
 * send it to another app.
 *
 * @returns `true` when the share sheet was presented.
 */
export async function shareFile(
  file: File,
  mimeType: string,
  dialogTitle?: string,
): Promise<boolean> {
  try {
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(file.uri, {
      mimeType,
      dialogTitle: dialogTitle ?? file.name,
      UTI: mimeType === 'application/json' ? 'public.json' : 'public.data',
    });
    return true;
  } catch {
    return false;
  }
}

/** Reads a text file from a `file://` URI. */
export async function readFileAsText(uri: string): Promise<string> {
  return new File(uri).text();
}

/** Opens the system document picker and returns the chosen file's URI. */
export async function pickDocument(
  types: string[] = ['application/json', 'text/csv', 'text/plain'],
): Promise<{ name: string; uri: string; mimeType?: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: types,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  return { name: asset.name, uri: asset.uri, mimeType: asset.mimeType };
}

/**
 * Converts rows into a CSV document.
 * Values containing a comma, quote or newline are quoted and escaped.
 */
export function toCSV(rows: Record<string, string | number | undefined>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number | undefined): string => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
}

/** Approximate size of a string in kilobytes, rounded up. */
export function sizeInKb(content: string): number {
  return Math.max(1, Math.ceil(content.length / 1024));
}
