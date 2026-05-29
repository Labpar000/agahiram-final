import sharp from 'sharp';
import { prisma } from '@agahiram/database';
import { getObject, putObject, deleteObject, keyFromUrl } from '../s3';

interface Job {
  mediaId: string;
}

export async function processImageJob({ mediaId }: Job) {
  const media = await prisma.postMedia.findUnique({ where: { id: mediaId } });
  if (!media) return;

  const originalKey = keyFromUrl(media.url);
  try {
    const buffer = await getObject(originalKey);
    const optimized = await sharp(buffer)
      .rotate()
      .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    const thumb = await sharp(buffer)
      .rotate()
      .resize(400, 400, { fit: 'cover' })
      .jpeg({ quality: 70, mozjpeg: true })
      .toBuffer();

    const base = originalKey.replace(/\.[^./]+$/, '');
    const optKey = `${base}_opt.jpg`;
    const thumbKey = `${base}_thumb.jpg`;

    const [optUrl, thumbUrl] = await Promise.all([
      putObject(optKey, optimized, 'image/jpeg'),
      putObject(thumbKey, thumb, 'image/jpeg'),
    ]);

    const meta = await sharp(optimized).metadata();
    await prisma.postMedia.update({
      where: { id: mediaId },
      data: {
        url: optUrl,
        thumbnailUrl: thumbUrl,
        width: meta.width,
        height: meta.height,
      },
    });

    // Drop the raw upload now that the optimized variants are stored.
    if (originalKey !== optKey) {
      await deleteObject(originalKey);
    }

    console.log(
      `[image] processed ${mediaId} (${optimized.length} bytes, was ${buffer.length} bytes)`,
    );
  } catch (e) {
    console.error(`[image] failed ${mediaId}`, e);
  }
}
