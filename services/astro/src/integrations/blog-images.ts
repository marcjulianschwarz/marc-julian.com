import type { AstroIntegration } from "astro";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const SUPPORTED = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const MAX_WIDTH = 1200;
const QUALITY = 82;

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

  logger.info(`blog-images: processed ${count} images → ${dest}`);
}
