import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/* The notebook. A malformed post fails the build loudly — that's the point.
   Frontmatter contract (see README "Writing a post"):
   - kind:   note (short, rough, thinking-out-loud) | essay (long, worked-through)
   - draft:  true keeps a post out of production builds entirely
   - growth: optional garden state — explicitly licenses unfinished work */
const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.enum(['lean', 'math', 'ai', 'code', 'neuro', 'meta'])).default([]),
    kind: z.enum(['note', 'essay']),
    draft: z.boolean().default(false),
    growth: z.enum(['seedling', 'growing', 'evergreen']).optional(),
  }),
});

export const collections = { posts };
