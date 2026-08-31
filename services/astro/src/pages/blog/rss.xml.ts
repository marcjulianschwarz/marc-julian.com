import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection, render } from "astro:content";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { blogConfig } from "@config";

export async function GET(context: APIContext) {
  const now = new Date();
  const posts = await getCollection("blog", (e) => {
    if (e.data["blog-skip"]) return false;
    if (e.data["blog-archived"]) return false;
    const pub = e.data["blog-published"];
    if (pub && pub > now) return false;
    return true;
  });

  posts.sort((a, b) => {
    const da = a.data["blog-published"]?.getTime() ?? 0;
    const db = b.data["blog-published"]?.getTime() ?? 0;
    return db - da;
  });

  const container = await AstroContainer.create();

  const items = await Promise.all(
    posts.map(async (post) => {
      const { Content } = await render(post);
      const html = await container.renderToString(Content);
      return {
        title: post.data["blog-title"],
        description: post.data["blog-subtitle"],
        pubDate: post.data["blog-published"],
        link: `${blogConfig.postsBase}/${post.id}`,
        content: html,
      };
    }),
  );

  return rss({
    title: blogConfig.title,
    description: blogConfig.description,
    site: context.site!,
    items,
  });
}
