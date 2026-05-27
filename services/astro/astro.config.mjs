// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import { blogImages } from './src/integrations/blog-images.ts';
import { blogConfig } from './blog.config.ts';
import rehypeFigure from 'rehype-figure';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { visit } from 'unist-util-visit';

function remarkImageToJpg() {
  return (tree) => {
    visit(tree, 'image', (node) => {
      if (node.url) {
        node.url = node.url.replace(/\.(png|webp|avif|jpeg)$/i, '.jpg');
      }
    });
  };
}

function rehypeImageToJpg() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName === 'img' && node.properties?.src) {
        node.properties.src = node.properties.src.replace(/\.(png|webp|avif|jpeg)$/i, '.jpg');
      }
    });
  };
}

// https://astro.build/config
export default defineConfig({
  integrations: [blogImages(blogConfig.imagesPath)],
  markdown: {
    remarkPlugins: [remarkImageToJpg],
    rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }], rehypeFigure, rehypeImageToJpg],
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
