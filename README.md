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

## Deploy

Push to `main`. GitHub Actions builds the site and deploys it to
https://qdiazblanco.github.io automatically (see `.github/workflows/deploy.yml`).

## Where things live (a map for future me)

| What | Where |
| --- | --- |
| Colors, fonts, spacing — all of them | `src/styles/tokens.css` |
| Shared CSS (buttons, cards, sections) | `src/styles/global.css` |
| Page shell (head, nav, footer) | `src/layouts/Base.astro` |
| Page sections | `src/components/*.astro` |
| Hero math (surfaces, critical points) | `src/lib/morse.ts` (+ tests) |
| Hero drawing | `src/scripts/hero.ts` |
| Lean proofs for the stepper | `src/data/proofs/` |
| Original design sketch | `reference/index.html` (never deployed) |

To change a color: edit it in `tokens.css` and nowhere else — the hero
canvas reads the same variables. To swap the stepper's proof: copy
`src/data/proofs/zero-add.ts`, follow its header comment, and **verify the
new proof with a real Lean compiler first**.
