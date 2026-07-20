import { getCollection } from 'astro:content';

/* Drafts are visible in `npm run dev` (so you can preview while writing)
   and excluded from production builds — the same rule everywhere.
   `SHOW_DRAFTS=1 npm run build && npm run preview` previews drafts through
   the real production pipeline; the deploy workflow never sets it. */
const showDrafts = import.meta.env.DEV || process.env.SHOW_DRAFTS === '1';

export const getPosts = async () =>
  (await getCollection('posts', ({ data }) => showDrafts || !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

/** published only — used by RSS and the nav gate, identical in dev and prod */
export const getPublished = async () =>
  (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

// UTC, matching how a bare `date: 2026-07-20` in frontmatter is parsed —
// otherwise a UTC-negative build machine renders the previous day
export const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
