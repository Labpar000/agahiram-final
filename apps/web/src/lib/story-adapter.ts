import type { User, StoryItem } from 'react-instagram-stories';

interface ApiStoryGroup {
  userId: string;
  user: { id: string; username: string | null; avatar: string | null };
  stories: Array<{
    id: string;
    mediaUrl: string;
    thumbnailUrl?: string | null;
    hlsUrl?: string | null;
    type: 'image' | 'video';
    linkedPostId?: string | null;
    viewerCount?: number;
    commentCount?: number;
    createdAt?: string;
    durationMs?: number;
    overlayJson?: unknown;
    stickers?: unknown;
    allowReplies?: string;
    viewed?: boolean;
    hasUnviewed?: boolean;
  }>;
  hasUnviewed?: boolean;
  viewerCount?: number;
  isMe?: boolean;
}

export function mapStoryGroupsToUsers(groups: ApiStoryGroup[]): User[] {
  return groups
    .filter((g) => !g.isMe || g.stories.length > 0)
    .map((g) => ({
      id: g.userId,
      username: g.isMe ? 'استوری شما' : (g.user.username ?? 'کاربر'),
      avatarUrl: g.user.avatar ?? '',
      hasUnreadStories: !!g.hasUnviewed,
      stories: g.stories.map((s) => mapStoryToItem(s)),
    }));
}

function mapStoryToItem(s: ApiStoryGroup['stories'][number]): StoryItem {
  return {
    id: s.id,
    type: s.type,
    src: s.mediaUrl,
    duration: s.type === 'video' ? undefined : (s.durationMs ?? 5000),
    alt: '',
  };
}
