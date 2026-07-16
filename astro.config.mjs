// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // User site (qdiazblanco.github.io repo) → served at the domain root,
  // so no `base` is needed. A future custom domain only changes this value.
  site: 'https://qdiazblanco.github.io',
});
