// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build/config
export default defineConfig({
  // User site (qdiazblanco.github.io repo) → served at the domain root,
  // so no `base` is needed. A future custom domain only changes this value.
  site: 'https://qdiazblanco.github.io',
  // Posts are plain .md by default; MDX is available for the day a post
  // needs an interactive island inside it.
  integrations: [mdx()],
  markdown: {
    // KaTeX renders math at BUILD time — posts arrive as plain HTML+CSS,
    // readable even with JS off. Commutative squares work via {CD}.
    // (markdown.remarkPlugins/rehypePlugins are deprecated in Astro 7 —
    // the pipeline is passed as a unified() processor instead.)
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
    // matches the Lean panel's editor aesthetic; Shiki bundles a Lean grammar
    shikiConfig: { theme: 'material-theme-palenight' },
  },
});
