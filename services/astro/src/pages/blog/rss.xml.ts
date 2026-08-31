import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";
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

  return rss({
    title: blogConfig.title,
    description: blogConfig.description,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data["blog-title"],
      description: post.data["blog-subtitle"],
      pubDate: post.data["blog-published"],
      link: `${blogConfig.postsBase}/${post.id}`,
    })),
  });
}
