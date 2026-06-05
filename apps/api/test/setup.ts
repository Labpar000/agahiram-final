import 'reflect-metadata';

process.env.NODE_ENV ??= 'test';
process.env.ADMIN_PHONES ??= '09120000000,09120000001';
process.env.JWT_SECRET ??= 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
process.env.COOKIE_SECRET ??= 'test-cookie-secret';
process.env.SMS_PROVIDER ??= 'dev';
