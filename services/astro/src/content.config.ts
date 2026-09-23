import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { blogConfig } from "@config";

const cameraSettings = z.object({
  aperture: z.string().optional(),
  shutter: z.string().optional(),
  iso: z.union([z.number(), z.string()]).optional(),
  focalLength: z.string().optional(),
});

const camera = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  lens: z.string().optional(),
  film: z.string().optional(),
  settings: cameraSettings.optional(),
});

const location = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
});

const photo = z.object({
  file: z.string(),
  slug: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  gallery: z.boolean().default(true),
  date: z.coerce.date().optional(),
  location: location.optional(),
  camera: camera.optional(),
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: blogConfig.postsPath }),
  schema: z.object({
    "blog-title": z.string(),
    "blog-subtitle": z.string().optional(),
    "blog-published": z.coerce.date().optional(),
    "blog-tags": z.array(z.string()).default([]),
    "blog-archived": z.boolean().default(false),
    "blog-skip": z.boolean().default(false),
    "blog-author": z.string().optional(),
    photos: z.array(photo).default([]),
  }),
});

export const collections = { blog };
