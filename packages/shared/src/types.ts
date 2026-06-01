export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

export enum PostStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pendingReview',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SOLD = 'sold',
  EXPIRED = 'expired',
  DELETED = 'deleted',
}

export enum PostType {
  POST = 'post',
  REEL = 'reel',
}

export enum PriceType {
  FIXED = 'fixed',
  NEGOTIABLE = 'negotiable',
  FREE = 'free',
  CALL_FOR_PRICE = 'callForPrice',
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

export enum NotificationType {
  LIKE = 'like',
  COMMENT = 'comment',
  FOLLOW = 'follow',
  MESSAGE = 'message',
  AD_APPROVED = 'adApproved',
  AD_REJECTED = 'adRejected',
  AD_REMOVED = 'adRemoved',
  BOOST_EXPIRING = 'boostExpiring',
  PRICE_DROP = 'priceDropOnSaved',
  STORY_MENTION = 'storyMention',
  WALLET_CREDIT = 'walletCredit',
  WALLET_DEBIT = 'walletDebit',
  BROADCAST = 'broadcast',
  SYSTEM_ANNOUNCEMENT = 'systemAnnouncement',
  INCOMING_CALL = 'incomingCall',
  MISSED_CALL = 'missedCall',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentPurpose {
  BOOST = 'boost',
  BUSINESS_ACCOUNT = 'businessAccount',
  WALLET_TOPUP = 'walletTopup',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VOICE = 'voice',
  POST = 'post',
  CALL_EVENT = 'call_event',
}

export enum AttributeType {
  TEXT = 'text',
  NUMBER = 'number',
  SELECT = 'select',
  BOOL = 'bool',
}

export type ReportTargetType = 'post' | 'story' | 'user' | 'comment';

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  /** HTTP status when available (client-side api helper). */
  statusCode?: number;
}

export interface JwtPayload {
  sub: string;
  phone: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  phone: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  avatar: string | null;
  isVerified: boolean;
  isBusiness: boolean;
  isPrivate?: boolean;
  role: UserRole;
  defaultCityId: string | null;
  storyArchiveEnabled?: boolean;
  createdAt: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
}

export interface PostSummary {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  priceType: PriceType;
  status: PostStatus;
  type: PostType;
  isPromoted: boolean;
  commentsEnabled?: boolean;
  qualityScore?: number;
  viewCount: number;
  viewedByMe?: boolean;
  isLiked?: boolean;
  isSaved?: boolean;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    avatar: string | null;
    isVerified: boolean;
    isBusiness: boolean;
    karma?: number;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  city: {
    id: string;
    name: string;
    slug?: string;
  } | null;
  media: Array<{
    id: string;
    url: string;
    thumbnailUrl: string | null;
    type: MediaType;
    order: number;
    width?: number | null;
    height?: number | null;
    hlsUrl?: string | null;
  }>;
}

export interface CategoryTree {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  order: number;
  children?: CategoryTree[];
  attributes?: CategoryAttributeDef[];
}

export interface CategoryAttributeDef {
  id: string;
  key: string;
  label: string;
  type: AttributeType;
  options: string[];
  required: boolean;
}

export interface SearchFilters {
  q?: string;
  query?: string;
  categoryId?: string;
  cityId?: string;
  provinceId?: string;
  neighborhoodId?: string;
  minPrice?: number;
  maxPrice?: number;
  priceType?: PriceType;
  hasImage?: boolean;
  onlyImage?: boolean;
  onlyVideo?: boolean;
  onlyPromoted?: boolean;
  lat?: number;
  lng?: number;
  sortBy?: 'newest' | 'cheapest' | 'nearest' | 'mostViewed' | 'relevance';
  attributes?: Record<string, string>;
  cursor?: string;
  limit?: number;
}

export interface SearchSuggestionItem {
  text: string;
  postId?: string;
  categoryId?: string | null;
  cityId?: string | null;
}

export interface ConversationSummary {
  id: string;
  otherUser: {
    id: string;
    username: string | null;
    name: string | null;
    avatar: string | null;
    isVerified: boolean;
  };
  lastMessage: {
    content: string;
    type: MessageType;
    createdAt: string;
    isRead: boolean;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface BoostPlan {
  id: string;
  name: string;
  durationHours: number;
  price: number;
  description: string | null;
}

export interface StoryItem {
  id: string;
  userId: string;
  mediaUrl: string;
  type: MediaType;
  expiresAt: string;
  linkedPostId: string | null;
  viewed: boolean;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    avatar: string | null;
    isVerified: boolean;
  };
}

export interface HighlightGroup {
  id: string;
  title: string;
  coverUrl: string | null;
  storiesCount: number;
}

export interface ReelItem extends PostSummary {
  hlsUrl: string | null;
  duration: number | null;
}

export interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  pendingPosts: number;
  totalReports: number;
  totalRevenue: number;
  dau: number;
  mau: number;
  trends?: {
    users?: number[];
    posts?: number[];
    revenue?: number[];
    dau?: number[];
  };
  deltas?: {
    users?: number;
    posts?: number;
    pending?: number;
    reports?: number;
    revenue?: number;
    dau?: number;
    mau?: number;
  };
}

export interface PlatformSettings {
  siteName: string;
  contactEmail: string | null;
  supportPhone: string | null;
  postsRequireApproval: boolean;
  allowRegistration: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  maxPostsPerDay: number;
  defaultPostExpiryDays: number;
  privacyContent: string | null;
  termsContent: string | null;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  siteName: 'آگهی‌گرام',
  contactEmail: null,
  supportPhone: null,
  postsRequireApproval: true,
  allowRegistration: true,
  maintenanceMode: false,
  maintenanceMessage: null,
  maxPostsPerDay: 10,
  defaultPostExpiryDays: 30,
  privacyContent: null,
  termsContent: null,
};

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  target: string | null;
  payload: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  actor?: {
    id: string;
    username: string | null;
    name: string | null;
  };
}

export interface PageResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface WalletInfo {
  balance: number;
  currency: string;
}

export interface LiveStreamInfo {
  id: string;
  userId: string;
  title: string;
  status: 'live' | 'ended' | 'scheduled';
  viewerCount: number;
  linkedPostId: string | null;
  startedAt: string | null;
}

export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number;
  suggestedPrice?: number;
}
