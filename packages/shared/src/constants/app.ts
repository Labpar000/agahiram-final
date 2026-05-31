export const APP_NAME = 'آگهی‌گرام';
export const APP_NAME_EN = 'Agahiram';
export const APP_DESCRIPTION = 'پلتفرم آگهی با ظاهر اینستاگرام';

export const JWT_ACCESS_EXPIRY = '15m';
export const JWT_REFRESH_EXPIRY = '30d';
export const OTP_EXPIRY_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RATE_LIMIT = 3;
export const OTP_RATE_WINDOW_MINUTES = 10;

/**
 * Single source of truth for who may access the admin panel. ONLY these phone
 * numbers can ever hold an elevated (admin/moderator) role. Enforced on login
 * (auto promote/demote), in the API RolesGuard, and in the admin app gate.
 */
export const ADMIN_PHONES: readonly string[] = ['09127477990', '09132609737'];

export function isAdminPhone(phone: string | null | undefined): boolean {
  return !!phone && ADMIN_PHONES.includes(phone);
}

export const POST_EXPIRY_DAYS = 30;
export const STORY_EXPIRY_HOURS = 24;
export const MAX_POST_MEDIA = 10;
export const MAX_REEL_DURATION = 60;
export const MAX_STORY_DURATION = 60;

/* Upload limits. Videos are re-encoded/compressed by the media-processor worker
 * after upload, so these caps protect the upload step + MinIO ingest, not the
 * final stored size. */
export const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB
export const MAX_VIDEO_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'] as const;
export const ALLOWED_UPLOAD_TYPES: string[] = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

export function maxUploadBytesFor(contentType: string): number {
  return contentType.startsWith('video/') ? MAX_VIDEO_UPLOAD_BYTES : MAX_IMAGE_UPLOAD_BYTES;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export const MEILI_INDEX_POSTS = 'posts';

export const MEDIA_FOLDERS = {
  POSTS: 'posts',
  AVATARS: 'avatars',
  STORIES: 'stories',
  REELS: 'reels',
  MESSAGES: 'messages',
  TEMP: 'temp',
} as const;

/** @deprecated Use MEDIA_FOLDERS */
export const S3_FOLDERS = MEDIA_FOLDERS;

export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MESSAGE_SEND: 'message:send',
  MESSAGE_RECEIVE: 'message:receive',
  MESSAGE_READ: 'message:read',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  NOTIFICATION: 'notification',
  LIVE_JOIN: 'live:join',
  LIVE_LEAVE: 'live:leave',
  LIVE_CHAT: 'live:chat',
} as const;

export const BULL_QUEUES = {
  MEDIA_PROCESSING: 'media-processing',
  NOTIFICATIONS: 'notifications',
  SEARCH_INDEX: 'search-index',
  STORY_CLEANUP: 'story-cleanup',
} as const;

export const BANNED_WORDS = ['فروش اعضا', 'مواد مخدر', 'سلاح', 'قمار', 'پورن'];

export const ZARINPAL_SANDBOX = 'https://sandbox.zarinpal.com/pg/v4/payment';
export const ZARINPAL_PRODUCTION = 'https://api.zarinpal.com/pg/v4/payment';

export const NESHAN_TILE_URL = 'https://api.neshan.org/v1/static';
export const NESHAN_GEOCODE_URL = 'https://api.neshan.org/v4/geocoding';
export const NESHAN_REVERSE_GEOCODE_URL = 'https://api.neshan.org/v5/reverse';

export const PWA_THEME_COLOR = '#db2777';
export const PWA_BACKGROUND_COLOR = '#ffffff';
