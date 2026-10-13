import type { AstroIntegration } from "astro";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { execFile } from "child_process";
import { promisify } from "util";

const SUPPORTED = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const VIDEOS = new Set([".mp4", ".mov", ".m4v", ".webm"]);
const MAX_WIDTH = 1200;
const QUALITY = 82;
// Higher CRF means a smaller file. 28 keeps screen recordings sharp.
const VIDEO_CRF = "28";

const execFileAsync = promisify(execFile);

export function blogImages(imagesPath: string): AstroIntegration {
  return {
    name: "blog-images",
    hooks: {
      "astro:build:start": async ({ logger }) => {
        await processImages(imagesPath, "public/images", logger);
      },
      "astro:server:start": async ({ logger }) => {
        await processImages(imagesPath, "public/images", logger);
      },
    },
  };
}

async function processImages(src: string, dest: string, logger: { info: (msg: string) => void }) {
  if (!fs.existsSync(src)) {
    logger.info(`blog-images: source path not found: ${src}`);
    return;
  }

  fs.mkdirSync(dest, { recursive: true });

  const files = fs.readdirSync(src);
  let count = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    const destFileJpg = destFile.replace(/\.(png|webp|avif|jpeg)$/i, ".jpg");

    // Videos are re-encoded to H.264 mp4, capped at MAX_WIDTH, audio kept
    if (VIDEOS.has(ext)) {
      const destFileMp4 = destFile.replace(/\.[^.]+$/, ".mp4");
      if (fs.existsSync(destFileMp4) && fs.statSync(destFileMp4).mtimeMs >= fs.statSync(srcFile).mtimeMs) continue;

      logger.info(`blog-images: encoding ${file}`);
      const tmpFile = `${destFileMp4}.tmp.mp4`;
      await execFileAsync("ffmpeg", [
        "-y",
        "-loglevel", "error",
        "-i", srcFile,
        "-vf", `scale='min(${MAX_WIDTH},iw)':-2`,
        "-c:v", "libx264",
        "-crf", VIDEO_CRF,
        "-preset", "slow",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "96k",
        "-movflags", "+faststart",
        tmpFile,
      ]);
      fs.renameSync(tmpFile, destFileMp4);
      count++;
      continue;
    }

    if (!SUPPORTED.has(ext)) {
      // Copy non-image files (svg, etc.) as-is
      fs.copyFileSync(srcFile, destFile);
      continue;
    }

    // Skip if already processed and source hasn't changed
    const cachedFile = fs.existsSync(destFile) ? destFile : fs.existsSync(destFileJpg) ? destFileJpg : null;
    if (cachedFile) {
      const srcMtime = fs.statSync(srcFile).mtimeMs;
      const destMtime = fs.statSync(cachedFile).mtimeMs;
      if (destMtime >= srcMtime) continue;
    }

    await sharp(srcFile)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: QUALITY, progressive: true })
      .toFile(destFileJpg);

    count++;
  }

  logger.info(`blog-images: processed ${count} images and videos → ${dest}`);
}
