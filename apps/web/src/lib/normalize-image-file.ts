/** Extension → MIME when mobile browsers omit `File.type` (common on iOS Safari). */
const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/jpeg',
  heif: 'image/jpeg',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  qt: 'video/quicktime',
};

const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', 'qt', 'quicktime']);

export function resolveFileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName) return fromName;
  return file.type.split('/').pop()?.toLowerCase() ?? 'bin';
}

export function resolveContentType(file: File): string {
  const ext = resolveFileExtension(file);
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type.split(';')[0]!.trim();
  }
  return EXT_TO_MIME[ext] ?? 'application/octet-stream';
}

/** Resolve presign content-type for gallery video picks (e.g. iOS `.mov`). */
export function resolveVideoUploadType(file: File): string {
  const ext = resolveFileExtension(file);
  const contentType = resolveContentType(file);
  if (contentType.startsWith('video/')) return contentType;
  if (ext === 'mov' || ext === 'qt') return 'video/quicktime';
  if (ext === 'webm') return 'video/webm';
  return 'video/mp4';
}

export function isVideoFile(file: File): boolean {
  const contentType = resolveContentType(file);
  if (contentType.startsWith('video/')) return true;
  return VIDEO_EXTS.has(resolveFileExtension(file));
}

const HEIC_EXTS = new Set(['heic', 'heif']);

/**
 * Normalize iOS camera-roll picks: fill missing MIME types and convert HEIC/HEIF
 * to JPEG so the editor, canvas, and API accept the file.
 */
export async function normalizeImageFile(file: File): Promise<File> {
  const ext = resolveFileExtension(file);
  const needsHeicConvert =
    HEIC_EXTS.has(ext) || file.type === 'image/heic' || file.type === 'image/heif';

  if (!needsHeicConvert) {
    const type = resolveContentType(file);
    if (type === file.type || !file.type) {
      return type !== file.type ? new File([file], file.name, { type }) : file;
    }
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    );
    if (!blob) return file;

    const name = file.name.replace(/\.[^./]+$/i, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
