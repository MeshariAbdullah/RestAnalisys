import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import { promisify } from "util";

const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);

export const UPLOADS_DIR = path.join(process.cwd(), "uploads");
export const FRAMES_DIR = path.join(process.cwd(), "frames");

export async function ensureDirectories() {
  await mkdir(UPLOADS_DIR, { recursive: true });
  await mkdir(FRAMES_DIR, { recursive: true });
}

export interface ExtractedFrame {
  frameIndex: number;
  timestampSec: number;
  filePath: string;
}

export function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration ?? 0;
      resolve(duration);
    });
  });
}

export function extractFrames(
  videoPath: string,
  videoId: number,
  options: {
    intervalSec?: number;
    maxFrames?: number;
    startSec?: number;
    endSec?: number;
    fps?: number;
  } = {}
): Promise<ExtractedFrame[]> {
  return new Promise(async (resolve, reject) => {
    const {
      intervalSec = 5,
      maxFrames = 30,
      startSec,
      endSec,
      fps,
    } = options;

    const framesDir = path.join(FRAMES_DIR, `video_${videoId}`);
    await mkdir(framesDir, { recursive: true });

    const extractedFrames: ExtractedFrame[] = [];

    let duration: number;
    try {
      duration = await getVideoDuration(videoPath);
    } catch (err) {
      return reject(err);
    }

    const effectiveStart = startSec ?? 0;
    const effectiveEnd = endSec ?? duration;
    const effectiveDuration = effectiveEnd - effectiveStart;

    const outputPattern = path.join(framesDir, "frame_%04d.jpg");

    let ffmpegCmd = ffmpeg(videoPath);

    if (startSec !== undefined) {
      ffmpegCmd = ffmpegCmd.setStartTime(startSec);
    }

    if (endSec !== undefined) {
      ffmpegCmd = ffmpegCmd.setDuration(effectiveDuration);
    }

    const vfFilter = fps
      ? `fps=${fps}`
      : `fps=1/${intervalSec}`;

    ffmpegCmd
      .outputOptions(["-vf", vfFilter, "-q:v", "3", "-frames:v", String(maxFrames)])
      .output(outputPattern)
      .on("end", () => {
        // Read extracted frames
        const files = fs
          .readdirSync(framesDir)
          .filter((f) => f.startsWith("frame_") && f.endsWith(".jpg"))
          .sort();

        files.forEach((file, index) => {
          const frameIndex = index;
          const timestampSec = effectiveStart + frameIndex * (fps ? 1 / fps : intervalSec);
          extractedFrames.push({
            frameIndex,
            timestampSec: Math.round(timestampSec * 100) / 100,
            filePath: path.join(framesDir, file),
          });
        });

        resolve(extractedFrames);
      })
      .on("error", reject)
      .run();
  });
}

export async function extractPass1Frames(
  videoPath: string,
  videoId: number
): Promise<ExtractedFrame[]> {
  return extractFrames(videoPath, videoId, {
    intervalSec: 5,
    maxFrames: 30,
  });
}

export async function extractPass2Frames(
  videoPath: string,
  videoId: number,
  eventTimestamps: number[]
): Promise<ExtractedFrame[]> {
  if (eventTimestamps.length === 0) return [];

  const allFrames: ExtractedFrame[] = [];

  for (const ts of eventTimestamps.slice(0, 3)) { // max 3 event windows
    const start = Math.max(0, ts - 5);
    const end = ts + 5;

    const frames = await extractFrames(videoPath, videoId, {
      fps: 1,
      maxFrames: 10,
      startSec: start,
      endSec: end,
    });

    allFrames.push(...frames);
  }

  return allFrames;
}

export async function cleanupVideoFrames(videoId: number) {
  const framesDir = path.join(FRAMES_DIR, `video_${videoId}`);
  if (fs.existsSync(framesDir)) {
    fs.rmSync(framesDir, { recursive: true });
  }
}
