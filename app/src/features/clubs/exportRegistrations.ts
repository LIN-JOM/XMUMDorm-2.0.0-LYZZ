import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportClubActivityRegistrations } from '../../../../shared/api/clubs';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const XLSX_UTI = 'org.openxmlformats.spreadsheetml.sheet';

type XlsxExport = { blob: Blob; filename: string };

function readXlsxExport(value: unknown): XlsxExport {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid roster export');
  const row = value as { blob?: unknown; filename?: unknown };
  if (!row.blob || typeof (row.blob as { arrayBuffer?: unknown }).arrayBuffer !== 'function' || typeof row.filename !== 'string') {
    throw new Error('Invalid roster export');
  }
  return { blob: row.blob as Blob, filename: row.filename };
}

/** Reduces a server-provided attachment name to one safe XLSX basename. */
export function safeXlsxFilename(value: unknown): string {
  const basename = typeof value === 'string' ? value.split(/[\\/]/).pop()?.trim() ?? '' : '';
  const stem = basename
    .replace(/\.[^.]*$/, '')
    .replace(/[<>:"|?*\u0000-\u001F]/g, '_')
    .replace(/^\.+|\.+$/g, '')
    .trim();
  return `${stem || 'registrations'}.xlsx`;
}

function downloadInBrowser(blob: Blob, filename: string): void {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('Browser download is unavailable');
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Persists the server-owned workbook, then asks the operating system to save or share it. */
export async function saveAndShareXlsx(exported: XlsxExport): Promise<void> {
  const filename = safeXlsxFilename(exported.filename);
  if (Platform.OS === 'web') {
    downloadInBrowser(exported.blob, filename);
    return;
  }
  if (!await Sharing.isAvailableAsync()) throw new Error('Sharing is unavailable');
  const file = new File(Paths.document, filename);
  file.create({ intermediates: true, overwrite: true });
  file.write(new Uint8Array(await exported.blob.arrayBuffer()));
  await Sharing.shareAsync(file.uri, { mimeType: XLSX_MIME, UTI: XLSX_UTI, dialogTitle: filename });
}

/** The App never generates roster rows; it writes and shares the backend's protected workbook. */
export async function exportClubActivityRegistrationsToDevice(activityId: number): Promise<void> {
  if (!Number.isSafeInteger(activityId) || activityId <= 0) throw new Error('Invalid activity ID');
  await saveAndShareXlsx(readXlsxExport(await exportClubActivityRegistrations(activityId)));
}
