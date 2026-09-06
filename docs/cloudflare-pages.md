# Deploying to Cloudflare Pages

Kasette's live site is hosted on GitHub Pages (see `.github/workflows/pages.yml`
and the README). This document covers an alternative deployment target,
Cloudflare Pages, using [Wrangler](https://developers.cloudflare.com/workers/wrangler/).
It's here mainly as a reference for deploying `www/` (a plain static site,
no build step) to Cloudflare instead of, or alongside, GitHub Pages.

## Prerequisites

- A Cloudflare account.
- Wrangler installed (`npm install` pulls in the `wrangler` devDependency
  already listed in `package.json`).
- Authenticate once with `npx wrangler login`.

## Config

`wrangler.jsonc` at the repo root points Wrangler at the static output
directory:

```jsonc
{
  "name": "kasette",
  "pages_build_output_dir": "www"
}
```

No build step is needed. `www/` is already the deployable site (the same
directory `pages_build_output_dir` and Capacitor's `webDir` both use).

## Deploy

```bash
npm run deploy:cloudflare
```

This runs `wrangler pages deploy www --project-name=kasette`, which creates
the Cloudflare Pages project on first run (or ships a new deployment to an
existing one) and prints the `*.pages.dev` URL.

## Custom domain

Cloudflare Pages projects can be attached to a custom domain from the
dashboard (Pages project → Custom domains), or via `wrangler pages domain
add`. Not required for Kasette; GitHub Pages already serves the project at
`nico-alvz.github.io/kasette`.

## Removing this

This Cloudflare setup is optional and independent of Kasette's actual
deployment (GitHub Pages). To remove it: delete `wrangler.jsonc` and this
file, drop the `wrangler` devDependency and the `deploy:cloudflare` script
from `package.json`, and delete the Pages project from the Cloudflare
dashboard if one was created.
