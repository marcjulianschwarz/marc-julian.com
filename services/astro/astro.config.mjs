// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import { blogImages } from './src/integrations/blog-images.ts';
import { photoImages } from './src/integrations/photo-images.ts';
import { rehypePhotoBlocks } from './src/integrations/rehype-photo-blocks.mjs';
import { blogConfig } from './blog.config.ts';
import rehypeFigure from 'rehype-figure';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { visit } from 'unist-util-visit';

// Obsidian embeds: ![[file]] and ![[file|alt]] point into the images folder.
// A numeric part after | is an Obsidian size hint and is dropped.
function remarkObsidianEmbeds() {
  const embed = /!\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g;
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index === undefined || !node.value.includes('![[')) return;
      const children = [];
      let last = 0;
      for (const match of node.value.matchAll(embed)) {
        if (match.index > last) children.push({ type: 'text', value: node.value.slice(last, match.index) });
        const alt = match[2] && !/^\d+(x\d+)?$/.test(match[2].trim()) ? match[2].trim() : '';
        children.push({ type: 'image', url: `/images/${encodeURI(match[1].trim())}`, alt });
        last = match.index + match[0].length;
      }
      if (children.length === 0) return;
      if (last < node.value.length) children.push({ type: 'text', value: node.value.slice(last) });
      parent.children.splice(index, 1, ...children);
      return index + children.length;
    });
  };
}

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

// ![alt](/images/clip.mov) becomes a video. blog-images encodes every video to mp4.
function rehypeImageToVideo() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img' || !/\.(mp4|mov|m4v|webm)$/i.test(node.properties?.src ?? '')) return;
      const src = node.properties.src.replace(/\.(mov|m4v|webm)$/i, '.mp4');
      const alt = node.properties.alt;
      node.tagName = 'video';
      node.properties = { src, controls: true, playsInline: true, preload: 'metadata', ...(alt ? { ariaLabel: alt } : {}) };
    });
  };
}

// Post files were renamed to a consistent kebab-case scheme. These keep the
// previously published URLs working.
const renamedPosts = {
  'aheadanniversary': 'ahead-anniversary',
  'animateradarplot': 'animate-radarplot',
  'applewatchmagsafe': 'apple-watch-magsafe',
  'betterfilelink': 'better-file-link',
  'cdustartup': 'cdu-startup',
  'codescriptablewidgets': 'code-scriptable-widgets',
  'dynamicwallpapers': 'dynamic-wallpapers',
  'gaming2050': 'gaming-2050',
  'grpcphoenix': 'grpc-phoenix',
  'obsraycast': 'obsidian-raycast',
  'obsraycastnew': 'obsidian-raycast-news',
  'obsraycastupdate': 'obsidian-raycast-update',
  'obsraycastupdate2': 'obsidian-raycast-update-02',
  'phoenixllmtracing': 'phoenix-llm-tracing',
  'podcastnote': 'obsidian-podcast-note',
  'pythonpackagedistribution': 'python-package-distribution',
  'reacttodoapp': 'react-todo-app',
  'scriptablewidgets': 'scriptable-widgets',
  'simpleperceptron': 'simple-perceptron',
  'tensortournament': 'tensor-tournament',
  'textgenmarkov': 'text-generation-markov',
  'tilterminalaliases': 'til-terminal-aliases',
  'tilvscoderegex': 'til-vscode-regex',
};

const postRedirects = Object.fromEntries(
  Object.entries(renamedPosts).flatMap(([from, to]) => [
    [`${blogConfig.postsBase}/${from}`, `${blogConfig.postsBase}/${to}`],
    [`${blogConfig.postsBase}/epaper/${from}`, `${blogConfig.postsBase}/epaper/${to}`],
  ])
);

// https://astro.build/config
export default defineConfig({
  site: 'https://marc-julian.com',
  redirects: postRedirects,
  integrations: [
    blogImages(blogConfig.imagesPath),
    photoImages(blogConfig.photosPath),
  ],
  markdown: {
    remarkPlugins: [remarkObsidianEmbeds, remarkImageToJpg],
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'wrap' }],
      rehypeFigure,
      rehypeImageToJpg,
      rehypeImageToVideo,
      [rehypePhotoBlocks, { requestEmail: blogConfig.photoRequestEmail }],
    ],
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
