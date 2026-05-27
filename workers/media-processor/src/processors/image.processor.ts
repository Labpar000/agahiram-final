import sharp from 'sharp';
import { prisma } from '@agahiram/database';
import { getObject, putObject } from '../s3';

interface Job {
  mediaId: string;
}

export async function processImageJob({ mediaId }: Job) {
  const media = await prisma.postMedia.findUnique({ where: { id: mediaId } });
  if (!media) return;

  const key = new URL(media.url).pathname.slice(1);
  try {
    const buffer = await getObject(key);
    const optimized = await sharp(buffer)
      .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    const thumb = await sharp(buffer)
      .resize(400, 400, { fit: 'cover' })
      .jpeg({ quality: 75 })
      .toBuffer();

    const optKey = key.replace(/\.[^.]+$/, '_opt.jpg');
    const thumbKey = key.replace(/\.[^.]+$/, '_thumb.jpg');

    const [optUrl, thumbUrl] = await Promise.all([
      putObject(optKey, optimized, 'image/jpeg'),
      putObject(thumbKey, thumb, 'image/jpeg'),
    ]);

    const meta = await sharp(buffer).metadata();
    await prisma.postMedia.update({
      where: { id: mediaId },
      data: {
        url: optUrl,
        thumbnailUrl: thumbUrl,
        width: meta.width,
        height: meta.height,
      },
    });
    console.log(`[image] processed ${mediaId}`);
  } catch (e) {
    console.error(`[image] failed ${mediaId}`, e);
  }
}
