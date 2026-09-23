import type { AstroIntegration } from "astro";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const SUPPORTED = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"]);

// Keeps the original aspect ratio, sized for a masonry column
const SMALL_WIDTH = 500;
const MEDIUM_WIDTH = 1600;
const ORIGINAL_MAX_WIDTH = 2400;
const JPEG_QUALITY = 90;
const WEBP_QUALITY = 85;

const VARIANTS = [
  "small.jpg",
  "small.webp",
  "medium.jpg",
  "medium.webp",
  "original.jpg",
  "meta.json",
];

export function photoImages(photosPath: string): AstroIntegration {
  return {
    name: "photo-images",
    hooks: {
      // Runs before content is rendered, so meta.json exists when posts compile
      "astro:config:setup": async ({ logger }) => {
        await processPhotos(photosPath, "public/photos", logger);
      },
    },
  };
}

// Slug of a photo is its filename without extension. Keep this in sync with lib/photos.ts.
function getSlug(filename: string): string {
  return path.basename(filename, path.extname(filename));
}

function isUpToDate(outDir: string, srcMtime: number): boolean {
  for (const variant of VARIANTS) {
    const file = path.join(outDir, variant);
    if (!fs.existsSync(file)) return false;
    if (fs.statSync(file).mtimeMs < srcMtime) return false;
  }
  return true;
}

async function processPhotos(src: string, dest: string, logger: { info: (msg: string) => void }) {
  if (!fs.existsSync(src)) {
    logger.info(`photo-images: source path not found: ${src}`);
    return;
  }

  fs.mkdirSync(dest, { recursive: true });

  const files = fs.readdirSync(src);
  let count = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!SUPPORTED.has(ext)) continue;

    const srcFile = path.join(src, file);
    const outDir = path.join(dest, getSlug(file));
    const srcMtime = fs.statSync(srcFile).mtimeMs;

    if (fs.existsSync(outDir) && isUpToDate(outDir, srcMtime)) continue;

    fs.mkdirSync(outDir, { recursive: true });

    // rotate() applies the EXIF orientation so every variant is upright
    const image = sharp(srcFile).rotate();

    const smallInfo = await image
      .clone()
      .resize({ width: SMALL_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 82, progressive: true })
      .toFile(path.join(outDir, "small.jpg"));

    await image
      .clone()
      .resize({ width: SMALL_WIDTH, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(path.join(outDir, "small.webp"));

    const mediumInfo = await image
      .clone()
      .resize({ width: MEDIUM_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, progressive: true })
      .toFile(path.join(outDir, "medium.jpg"));

    await image
      .clone()
      .resize({ width: MEDIUM_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(path.join(outDir, "medium.webp"));

    await image
      .clone()
      .resize({ width: ORIGINAL_MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, progressive: true })
      .toFile(path.join(outDir, "original.jpg"));

    // Dimensions let the pages reserve space, so lazy images cannot shift anchors
    fs.writeFileSync(
      path.join(outDir, "meta.json"),
      JSON.stringify({
        small: { width: smallInfo.width, height: smallInfo.height },
        medium: { width: mediumInfo.width, height: mediumInfo.height },
      }),
    );

    count++;
  }

  logger.info(`photo-images: processed ${count} photos → ${dest}`);
}
