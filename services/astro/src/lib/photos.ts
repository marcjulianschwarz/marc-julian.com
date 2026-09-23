import fs from "fs";
import path from "path";
import { getCollection, type CollectionEntry } from "astro:content";
import { blogConfig } from "@config";

export interface PhotoSize {
  width: number;
  height: number;
}

export interface PhotoImages {
  small: { jpg: string; webp: string };
  medium: { jpg: string; webp: string };
  original: string;
}

interface PhotoMeta {
  small: PhotoSize;
  medium: PhotoSize;
}

// Written by the photo-images integration next to the generated variants
function readMeta(slug: string): PhotoMeta | undefined {
  const file = path.join(process.cwd(), "public", "photos", slug, "meta.json");
  if (!fs.existsSync(file)) return undefined;
  return JSON.parse(fs.readFileSync(file, "utf8")) as PhotoMeta;
}

export interface Photo {
  slug: string;
  file: string;
  title: string;
  description?: string;
  gallery: boolean;
  date?: Date;
  location?: { city?: string; country?: string };
  camera?: {
    make?: string;
    model?: string;
    lens?: string;
    film?: string;
    settings?: {
      aperture?: string;
      shutter?: string;
      iso?: number | string;
      focalLength?: string;
    };
  };
  postId: string;
  postTitle: string;
  href: string;
  images: PhotoImages;
  size?: PhotoMeta;
}

// Slug of a photo is its filename without extension. Keep this in sync with integrations/photo-images.ts.
export function photoSlug(file: string): string {
  return file.replace(/\.[^.]+$/, "");
}

export function isPhotographyPost(post: CollectionEntry<"blog">): boolean {
  const tag = blogConfig.photographyTag.toLowerCase();
  return post.data["blog-tags"].some((t) => t.toLowerCase() === tag);
}

export function getPhotosForPost(post: CollectionEntry<"blog">): Photo[] {
  const postTitle = post.data["blog-title"];

  return post.data.photos.map((entry) => {
    const slug = entry.slug ?? photoSlug(entry.file);
    const base = `/photos/${slug}`;

    return {
      slug,
      file: entry.file,
      title: entry.title ?? postTitle,
      description: entry.description,
      gallery: entry.gallery,
      date: entry.date ?? post.data["blog-published"],
      location: entry.location,
      camera: entry.camera,
      postId: post.id,
      postTitle,
      href: `${blogConfig.postsBase}/${post.id}#photo-${slug}`,
      images: {
        small: { jpg: `${base}/small.jpg`, webp: `${base}/small.webp` },
        medium: { jpg: `${base}/medium.jpg`, webp: `${base}/medium.webp` },
        original: `${base}/original.jpg`,
      },
      size: readMeta(slug),
    };
  });
}

async function getVisiblePhotographyPosts(): Promise<CollectionEntry<"blog">[]> {
  const now = new Date();
  return await getCollection("blog", (e) => {
    if (e.data["blog-skip"]) return false;
    const pub = e.data["blog-published"];
    if (pub && pub > now) return false;
    return isPhotographyPost(e);
  });
}

export async function getGalleryPhotos(): Promise<Photo[]> {
  const posts = await getVisiblePhotographyPosts();

  const photos = posts.flatMap((post) => getPhotosForPost(post)).filter((photo) => photo.gallery);

  return photos.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
}
