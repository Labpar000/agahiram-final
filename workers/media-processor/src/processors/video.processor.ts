import ffmpeg from 'fluent-ffmpeg';
import { writeFile, mkdir, readdir, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { prisma } from '@agahiram/database';
import { getObject, putObject, deleteObject, keyFromUrl } from '../minio';

const ffmpegBin = process.env.FFMPEG_PATH || '/usr/bin/ffmpeg';
const ffprobeBin = process.env.FFPROBE_PATH || '/usr/bin/ffprobe';
ffmpeg.setFfmpegPath(ffmpegBin);
ffmpeg.setFfprobePath(ffprobeBin);

interface Job {
  mediaId: string;
  postId?: string;
  coverTimeSec?: number;
}

/** Downscale so the video fits inside 1080x1920 while keeping aspect ratio, and
 *  force even dimensions (H.264 requires width/height divisible by 2). */
const SCALE_FILTER =
  "scale='min(1080,iw)':'min(1920,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2";

function probe(path: string): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(path, (err, data) => (err ? reject(err) : resolve(data)));
  });
}

export async function processVideoJob({ mediaId, coverTimeSec }: Job) {
  const media = await prisma.postMedia.findUnique({ where: { id: mediaId } });
  if (!media) return;

  const originalKey = keyFromUrl(media.url);
  const work = join(tmpdir(), `agahiram-${mediaId}`);
  const outputDir = join(work, 'hls');
  await mkdir(outputDir, { recursive: true });
  const inputPath = join(work, 'input');
  const optimizedPath = join(work, 'optimized.mp4');

  try {
    const buffer = await getObject(originalKey);
    await writeFile(inputPath, buffer);

    // Read source dimensions/duration up front so we can persist them.
    let width: number | undefined;
    let height: number | undefined;
    let duration: number | undefined;
    try {
      const meta = await probe(inputPath);
      const stream = meta.streams.find((s) => s.codec_type === 'video');
      width = stream?.width ?? undefined;
      height = stream?.height ?? undefined;
      duration = meta.format?.duration ? Math.round(meta.format.duration) : undefined;
    } catch (e) {
      console.warn(`[video] ffprobe failed for ${mediaId}`, (e as Error).message);
    }

    // 1) Re-encode to a compressed, web-friendly MP4 (H.264 + AAC, faststart).
    //    This is what actually shrinks storage — the old `-codec copy` kept the
    //    original size and broke on HEVC/.mov inputs.
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioBitrate('128k')
        .outputOptions([
          '-vf',
          SCALE_FILTER,
          '-preset',
          'veryfast',
          '-crf',
          '26',
          '-pix_fmt',
          'yuv420p',
          '-movflags',
          '+faststart',
          '-max_muxing_queue_size',
          '1024',
        ])
        .output(optimizedPath)
        .on('end', () => resolve())
        .on('error', (e) => reject(e))
        .run();
    });

    const optimizedBuf = await readFile(optimizedPath);
    const optKey = originalKey.replace(/\.[^./]+$/, '') + '_opt.mp4';
    const optUrl = await putObject(optKey, optimizedBuf, 'video/mp4');

    // 2) Segment the *optimized* file into HLS for adaptive streaming/seeking.
    let playlistUrl = '';
    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(optimizedPath)
          .outputOptions([
            '-codec',
            'copy',
            '-start_number',
            '0',
            '-hls_time',
            '6',
            '-hls_list_size',
            '0',
            '-f',
            'hls',
          ])
          .output(join(outputDir, 'index.m3u8'))
          .on('end', () => resolve())
          .on('error', (e) => reject(e))
          .run();
      });

      const baseKey = originalKey.replace(/\.[^./]+$/, '') + '_hls';
      const files = await readdir(outputDir);
      for (const f of files) {
        const buf = await readFile(join(outputDir, f));
        const ct = f.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T';
        const url = await putObject(`${baseKey}/${f}`, buf, ct);
        if (f === 'index.m3u8') playlistUrl = url;
      }
    } catch (e) {
      // HLS is an optimisation; if it fails we still have the optimized MP4.
      console.warn(`[video] HLS packaging failed for ${mediaId}`, (e as Error).message);
    }

    // 3) Poster/thumbnail from the user-selected frame (or 1s by default).
    let thumbUrl: string | undefined;
    const thumbAt = Math.max(0, coverTimeSec ?? 1);
    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(optimizedPath)
          .screenshots({
            timestamps: [String(thumbAt)],
            filename: 'thumb.jpg',
            folder: work,
            size: '720x?',
          })
          .on('end', () => resolve())
          .on('error', (e) => reject(e));
      });
      const thumbBuf = await readFile(join(work, 'thumb.jpg'));
      const baseKey = originalKey.replace(/\.[^./]+$/, '') + '_hls';
      thumbUrl = await putObject(`${baseKey}/thumb.jpg`, thumbBuf, 'image/jpeg');
    } catch (e) {
      console.warn(`[video] thumbnail failed for ${mediaId}`, (e as Error).message);
    }

    await prisma.postMedia.update({
      where: { id: mediaId },
      data: {
        url: optUrl,
        hlsUrl: playlistUrl || null,
        thumbnailUrl: thumbUrl ?? media.thumbnailUrl,
        width,
        height,
        duration,
      },
    });

    // 4) Reclaim storage: the original (often large/HEVC) upload is no longer
    //    referenced once we serve the optimized MP4 + HLS.
    if (originalKey !== optKey) {
      await deleteObject(originalKey);
    }

    console.log(
      `[video] processed ${mediaId} (${optimizedBuf.length} bytes, was ${buffer.length} bytes)`,
    );
  } catch (e) {
    console.error(`[video] failed ${mediaId}`, e);
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => null);
  }
}
