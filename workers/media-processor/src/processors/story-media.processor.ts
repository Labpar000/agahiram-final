import ffmpeg from 'fluent-ffmpeg';
import { writeFile, mkdir, readdir, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { prisma } from '@agahiram/database';
import { getObject, putObject } from '../minio';

const ffmpegBin = process.env.FFMPEG_PATH || '/usr/bin/ffmpeg';
const ffprobeBin = process.env.FFPROBE_PATH || '/usr/bin/ffprobe';
ffmpeg.setFfmpegPath(ffmpegBin);
ffmpeg.setFfprobePath(ffprobeBin);

interface StoryMediaJob {
  storyId: string;
}

export async function processStoryMediaJob({ storyId }: StoryMediaJob) {
  const story = await prisma.story.findUnique({ where: { id: storyId } });
  if (!story?.mediaKey) return;

  if (story.type === 'image') {
    await prisma.story.update({
      where: { id: storyId },
      data: { thumbnailUrl: story.thumbnailUrl ?? story.mediaUrl },
    });
    return;
  }

  const work = join(tmpdir(), `agahiram-story-${storyId}`);
  const outputDir = join(work, 'hls');
  await mkdir(outputDir, { recursive: true });
  const inputPath = join(work, 'input');
  const thumbPath = join(work, 'thumb.jpg');

  try {
    const buffer = await getObject(story.mediaKey);
    await writeFile(inputPath, buffer);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: ['00:00:00.500'],
          filename: 'thumb.jpg',
          folder: work,
          size: '360x640',
        })
        .on('end', () => resolve())
        .on('error', reject);
    });

    const thumbBuf = await readFile(thumbPath);
    const thumbKey = story.mediaKey.replace(/\.[^.]+$/, '') + '-thumb.jpg';
    const thumbnailUrl = await putObject(thumbKey, thumbBuf, 'image/jpeg');

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-vf',
          "scale='min(1080,iw)':'min(1920,ih)':force_original_aspect_ratio=decrease",
          '-c:v',
          'libx264',
          '-c:a',
          'aac',
          '-preset',
          'veryfast',
          '-crf',
          '28',
          '-hls_time',
          '2',
          '-hls_list_size',
          '0',
          '-hls_segment_filename',
          join(outputDir, 'seg%03d.ts'),
        ])
        .output(join(outputDir, 'index.m3u8'))
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });

    let hlsUrl: string | undefined;
    try {
      const files = await readdir(outputDir);
      for (const f of files) {
        const buf = await readFile(join(outputDir, f));
        const key = `${story.mediaKey.replace(/\.[^.]+$/, '')}/hls/${f}`;
        const ct = f.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t';
        const url = await putObject(key, buf, ct);
        if (f === 'index.m3u8') hlsUrl = url;
      }
    } catch {
      /* HLS optional */
    }

    await prisma.story.update({
      where: { id: storyId },
      data: {
        thumbnailUrl: thumbnailUrl ?? story.mediaUrl,
        ...(hlsUrl ? { hlsUrl } : {}),
      },
    });
  } catch {
    await prisma.story.update({
      where: { id: storyId },
      data: { thumbnailUrl: story.mediaUrl },
    });
  } finally {
    try {
      await rm(work, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}
