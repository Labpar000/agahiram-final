/** Extract MinIO object key from a public media URL (same-origin or absolute). */
export function mediaKeyFromUrl(url: string): string | null {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://agahiram.ir';
    const parsed = new URL(url, base);
    const key = parsed.searchParams.get('key');
    if (key) return decodeURIComponent(key);
  } catch {
    /* fall through */
  }
  const m = url.match(/[?&]key=([^&]+)/);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}
