import ffmpeg from 'fluent-ffmpeg';
import { writeFile, mkdir, readdir, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { prisma } from '@agahiram/database';
import { getObject, putObject } from '../s3';

const ffmpegBin = process.env.FFMPEG_PATH || '/usr/bin/ffmpeg';
const ffprobeBin = process.env.FFPROBE_PATH || '/usr/bin/ffprobe';
ffmpeg.setFfmpegPath(ffmpegBin);
ffmpeg.setFfprobePath(ffprobeBin);

interface Job {
  mediaId: string;
  postId?: string;
}

export async function processVideoJob({ mediaId }: Job) {
  const media = await prisma.postMedia.findUnique({ where: { id: mediaId } });
  if (!media) return;

  const key = new URL(media.url).pathname.slice(1);
  const work = join(tmpdir(), `agahiram-${mediaId}`);
  await mkdir(work, { recursive: true });
  const inputPath = join(work, 'input.mp4');
  const outputDir = join(work, 'hls');
  await mkdir(outputDir, { recursive: true });

  try {
    const buffer = await getObject(key);
    await writeFile(inputPath, buffer);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-codec: copy',
          '-start_number 0',
          '-hls_time 6',
          '-hls_list_size 0',
          '-f hls',
        ])
        .output(join(outputDir, 'index.m3u8'))
        .on('end', () => resolve())
        .on('error', (e) => reject(e))
        .run();
    });

    const baseKey = key.replace(/\.[^.]+$/, '_hls');
    const files = await readdir(outputDir);
    let playlistUrl = '';
    for (const f of files) {
      const buf = await readFile(join(outputDir, f));
      const ct = f.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T';
      const url = await putObject(`${baseKey}/${f}`, buf, ct);
      if (f === 'index.m3u8') playlistUrl = url;
    }

    const thumbPath = join(work, 'thumb.jpg');
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({ timestamps: ['1'], filename: 'thumb.jpg', folder: work, size: '720x?' })
        .on('end', () => resolve())
        .on('error', (e) => reject(e));
    });
    const thumbBuf = await readFile(thumbPath);
    const thumbUrl = await putObject(`${baseKey}/thumb.jpg`, thumbBuf, 'image/jpeg');

    await prisma.postMedia.update({
      where: { id: mediaId },
      data: { hlsUrl: playlistUrl, thumbnailUrl: thumbUrl },
    });
    console.log(`[video] processed ${mediaId}`);
  } catch (e) {
    console.error(`[video] failed ${mediaId}`, e);
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => null);
  }
}
