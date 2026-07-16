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
