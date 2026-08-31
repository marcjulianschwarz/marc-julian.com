import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { blogConfig } from "@config";

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
  }),
});

export const collections = { blog };
