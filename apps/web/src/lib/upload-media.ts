export type UploadResult = { ok: true } | { ok: false; status?: number; detail?: string };

export function uploadToMinio(
  url: string,
  file: File,
  contentType: string,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true });
        return;
      }
      resolve({
        ok: false,
        status: xhr.status,
        detail: xhr.responseText?.slice(0, 200) || undefined,
      });
    };
    xhr.onerror = () => resolve({ ok: false, detail: 'network_error' });
    xhr.onabort = () => resolve({ ok: false, detail: 'aborted' });
    xhr.send(file);
  });
}
