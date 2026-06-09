const SESSION_KEY = 'agahiram_ad_session';

export function getAdSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `s_${Date.now()}`;
  }
}
