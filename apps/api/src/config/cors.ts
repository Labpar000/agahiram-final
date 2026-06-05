/** Shared CORS origin list for HTTP and WebSocket gateways. */
export function getCorsOrigins(): string[] {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }
  const frontend = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const admin = process.env.ADMIN_URL ?? 'http://localhost:3001';
  return [
    frontend,
    admin,
    /* Playwright + some browsers use 127.0.0.1 instead of localhost */
    frontend.replace('localhost', '127.0.0.1'),
    admin.replace('localhost', '127.0.0.1'),
    /* legacy ports some dev configs still use */
    'http://localhost:3000',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ];
}
