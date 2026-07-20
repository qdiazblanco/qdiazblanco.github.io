import rss from '@astrojs/rss';
import { getPublished } from '../lib/posts';

export async function GET(context) {
  const posts = await getPublished();
  return rss({
    title: 'Enrique Díaz Blanco — proofs & signals',
    description:
      'Notes and essays on Lean, mathematics, AI and signal processing — a digital notebook, learning in public.',
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      link: `/blog/${p.id}/`,
    })),
  });
}
