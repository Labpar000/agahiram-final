export const APP_NAME = 'آگهی‌گرام';
export const APP_NAME_EN = 'Agahiram';
export const APP_DESCRIPTION = 'پلتفرم آگهی با ظاهر اینستاگرام';

export const JWT_ACCESS_EXPIRY = '15m';
export const JWT_REFRESH_EXPIRY = '30d';
export const OTP_EXPIRY_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RATE_LIMIT = 3;
export const OTP_RATE_WINDOW_MINUTES = 10;

export const POST_EXPIRY_DAYS = 30;
export const STORY_EXPIRY_HOURS = 24;
export const MAX_POST_MEDIA = 10;
export const MAX_REEL_DURATION = 60;
export const MAX_STORY_DURATION = 15;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export const MEILI_INDEX_POSTS = 'posts';

export const S3_FOLDERS = {
  POSTS: 'posts',
  AVATARS: 'avatars',
  STORIES: 'stories',
  REELS: 'reels',
  MESSAGES: 'messages',
  TEMP: 'temp',
} as const;

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
