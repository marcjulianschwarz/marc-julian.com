// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import { blogImages } from './src/integrations/blog-images.ts';
import { blogConfig } from './blog.config.ts';

// https://astro.build/config
export default defineConfig({
  integrations: [blogImages(blogConfig.imagesPath)],
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
