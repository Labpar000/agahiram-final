type UploadResult = { ok: true } | { ok: false; status?: number; detail?: string };

function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') return '/api/v1';
  const upstream = process.env.INTERNAL_API_URL ?? 'http://127.0.0.1:4000';
  return `${upstream.replace(/\/$/, '')}/api/v1`;
}

export function resolveMediaUploadUrl(uploadUrl: string, apiBase = getApiBase()): string {
  if (uploadUrl.startsWith('http://') || uploadUrl.startsWith('https://')) return uploadUrl;
  const base = apiBase.replace(/\/$/, '');
  const path = uploadUrl.startsWith('/') ? uploadUrl : `/${uploadUrl}`;
  if (path.startsWith('/api/v1') && (base === '/api/v1' || base.endsWith('/api/v1'))) {
    return `${base}${path.slice('/api/v1'.length)}`;
  }
  return `${base}${path}`;
}

export function uploadToMinio(url: string, file: File, contentType: string): Promise<UploadResult> {
  const resolvedUrl = resolveMediaUploadUrl(url);
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', resolvedUrl, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader('Content-Type', contentType);
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
