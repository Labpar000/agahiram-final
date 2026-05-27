import {
  MediaType,
  PostStatus,
  PostType,
  PriceType,
  type PostSummary,
  type StoryItem,
  type ConversationSummary,
  type NotificationItem,
  NotificationType,
  MessageType,
  type ReelItem,
  type UserProfile,
} from '@agahiram/shared';

const placeholder = (seed: number, w = 400, h = 400) =>
  `https://picsum.photos/seed/agahiram${seed}/${w}/${h}`;

export const mockUser: UserProfile = {
  id: 'user-1',
  phone: '09121234567',
  name: 'علی محمدی',
  username: 'ali_m',
  bio: 'فروشنده لوازم دیجیتال | تهران',
  avatar: placeholder(1, 150, 150),
  isVerified: true,
  isBusiness: false,
  role: 'user' as UserProfile['role'],
  defaultCityId: null,
  createdAt: new Date().toISOString(),
  followersCount: 1240,
  followingCount: 320,
  postsCount: 48,
};

export const mockPosts: PostSummary[] = Array.from({ length: 12 }, (_, i) => ({
  id: `post-${i + 1}`,
  title: ['آیفون ۱۵ پرو مکس', 'پژو ۲۰۶ تیپ ۲', 'آپارتمان ۸۵ متری', 'مبل راحتی'][i % 4]!,
  description: 'توضیحات کامل آگهی در اینجا قرار می‌گیرد.',
  price: [45000000, 320000000, 8500000000, 12000000][i % 4]!,
  priceType: PriceType.FIXED,
  status: PostStatus.APPROVED,
  type: PostType.POST,
  isPromoted: i % 5 === 0,
  viewCount: 120 + i * 30,
  likesCount: 15 + i * 3,
  commentsCount: 2 + i,
  createdAt: new Date(Date.now() - i * 3600000).toISOString(),
  user: {
    id: `user-${(i % 3) + 1}`,
    username: ['ali_m', 'sara_k', 'reza_t'][i % 3]!,
    name: ['علی', 'سارا', 'رضا'][i % 3]!,
    avatar: placeholder(i + 10, 80, 80),
    isVerified: i % 2 === 0,
    isBusiness: i % 4 === 0,
  },
  category: { id: 'cat-1', name: 'موبایل', slug: 'mobile' },
  city: { id: 'city-1', name: 'تهران' },
  media: [
    {
      id: `media-${i}`,
      url: placeholder(i + 20, 600, 600),
      thumbnailUrl: placeholder(i + 20, 200, 200),
      type: MediaType.IMAGE,
      order: 0,
    },
  ],
}));

export const mockStories: StoryItem[] = Array.from({ length: 8 }, (_, i) => ({
  id: `story-${i}`,
  userId: `user-${i + 1}`,
  mediaUrl: placeholder(i + 30, 400, 700),
  type: MediaType.IMAGE,
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  linkedPostId: null,
  viewed: i > 2,
  createdAt: new Date().toISOString(),
  user: {
    id: `user-${i + 1}`,
    username: `user_${i}`,
    avatar: placeholder(i + 40, 80, 80),
    isVerified: i % 3 === 0,
  },
}));

export const mockReels: ReelItem[] = mockPosts.slice(0, 6).map((p, i) => ({
  ...p,
  type: PostType.REEL,
  hlsUrl: null,
  duration: 30 + i * 5,
  media: [
    {
      ...p.media[0]!,
      type: MediaType.VIDEO,
      url: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4`,
      hlsUrl: null,
    },
  ],
}));

export const mockConversations: ConversationSummary[] = Array.from({ length: 6 }, (_, i) => ({
  id: `conv-${i}`,
  otherUser: {
    id: `user-${i + 2}`,
    username: `user_${i + 2}`,
    name: `کاربر ${i + 1}`,
    avatar: placeholder(i + 50, 80, 80),
    isVerified: false,
  },
  lastMessage: {
    content: 'سلام، هنوز موجوده؟',
    type: MessageType.TEXT,
    createdAt: new Date(Date.now() - i * 600000).toISOString(),
    isRead: i > 1,
  },
  unreadCount: i < 2 ? i + 1 : 0,
  updatedAt: new Date(Date.now() - i * 600000).toISOString(),
}));

export const mockNotifications: NotificationItem[] = [
  {
    id: 'n1',
    type: NotificationType.LIKE,
    payload: { username: 'sara_k', postId: 'post-1' },
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'n2',
    type: NotificationType.FOLLOW,
    payload: { username: 'reza_t' },
    isRead: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'n3',
    type: NotificationType.COMMENT,
    payload: { username: 'ali_m', postId: 'post-2', text: 'قیمت نهایی چنده؟' },
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];
