// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import { blogImages } from './src/integrations/blog-images.ts';
import { blogConfig } from './blog.config.ts';
import rehypeFigure from 'rehype-figure';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

// https://astro.build/config
export default defineConfig({
  integrations: [blogImages(blogConfig.imagesPath)],
  markdown: {
    rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }], rehypeFigure],
    shikiConfig: {
      themes: {
        light: 'ayu-light',
        dark: 'ayu-dark',
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@config': fileURLToPath(new URL('./blog.config.ts', import.meta.url)),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      }
    }
  }
});
