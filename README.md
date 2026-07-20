# qdiazblanco.github.io

My personal site — a digital notebook where I think in public about Lean,
mathematics, and programming.

Built with [Astro](https://astro.build), deployed to GitHub Pages.

## Run locally

```sh
npm install
npm run dev
```

## Build & preview the production site

```sh
npm run build
npm run preview
```

## Test

```sh
npm test
```

Runs the unit tests, including the hero's founding invariant: for every
surface in the family, the critical points derived from its profile must
satisfy Σ(-1)^index = χ. CI runs this before every deploy.

## Writing a post

Create a Markdown file in `src/content/posts/`:

```markdown
---
title: "A title"
description: "One sentence for the index and the RSS feed."
date: 2026-07-20
tags: [lean, math]        # lean | math | ai | code | neuro | meta
kind: note                # note (short, rough) | essay (worked-through)
growth: seedling          # optional: seedling | growing | evergreen
draft: true               # flip to false (or remove) to publish
---

Text, with $inline$ and $$display$$ math, and ```lean code blocks.
```

Push to `main` — that's the whole pipeline. Drafts show up in `npm run dev`
but never in the published site. The Blog section appears automatically with
the first published post. Math renders at build time (KaTeX, including `{CD}`
commutative diagrams); code highlighting knows Lean.

## Deploy

Push to `main`. GitHub Actions runs the tests, builds the site, and deploys it
to https://qdiazblanco.github.io (see `.github/workflows/deploy.yml`).
