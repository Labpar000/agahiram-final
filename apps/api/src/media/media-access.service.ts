import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { MEDIA_FOLDERS } from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';
import { getCookieSecret } from '../config/secrets';

const PUBLIC_FOLDERS = new Set<string>([
  MEDIA_FOLDERS.POSTS,
  MEDIA_FOLDERS.AVATARS,
  MEDIA_FOLDERS.REELS,
  MEDIA_FOLDERS.STORIES,
]);

const DEFAULT_SIGNED_TTL_SEC = 3600;

@Injectable()
export class MediaAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Verify HMAC signature for a media key (optional share links). */
  verifySignature(key: string, exp: string | undefined, sig: string | undefined): boolean {
    if (!exp || !sig) return false;
    const expNum = Number(exp);
    if (!Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000)) return false;
    const expected = this.sign(key, exp);
    try {
      const a = Buffer.from(expected, 'hex');
      const b = Buffer.from(sig, 'hex');
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  generateSignedUrl(key: string, ttlSec = DEFAULT_SIGNED_TTL_SEC): string {
    const exp = String(Math.floor(Date.now() / 1000) + ttlSec);
    const sig = this.sign(key, exp);
    return `/api/v1/media/object?key=${encodeURIComponent(key)}&exp=${exp}&sig=${sig}`;
  }

  async canAccess(
    userId: string | undefined,
    key: string,
    sig?: string,
    exp?: string,
  ): Promise<boolean> {
    if (sig && this.verifySignature(key, exp, sig)) return true;

    const folder = key.split('/')[0] ?? '';
    if (PUBLIC_FOLDERS.has(folder)) {
      return true;
    }

    if (folder === MEDIA_FOLDERS.MESSAGES) {
      if (!userId) return false;
      return this.canAccessMessageMedia(userId, key);
    }

    /* temp/ and unknown folders require authentication + ownership */
    if (!userId) return false;
    const parts = key.split('/');
    const ownerId = parts[1];
    return ownerId === userId;
  }

  private async canAccessMessageMedia(userId: string, key: string): Promise<boolean> {
    const ownerId = key.split('/')[1];
    if (ownerId === userId) return true;

    // Message content stores `/api/v1/media/object?key=<url-encoded-key>`; a raw
    // key match (`messages/user/uuid.webm`) never hits encoded slashes (`%2F`).
    const encodedKeyParam = `key=${encodeURIComponent(key)}`;
    const message = await this.prisma.message.findFirst({
      where: {
        OR: [{ content: { contains: encodedKeyParam } }, { content: { contains: key } }],
      },
      select: { conversationId: true },
    });
    if (!message) return false;

    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: message.conversationId, userId } },
    });
    return !!participant;
  }

  private sign(key: string, exp: string): string {
    return createHmac('sha256', getCookieSecret()).update(`${key}:${exp}`).digest('hex');
  }
}
