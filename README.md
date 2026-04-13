# sybilsedge.com

Personal site for Sybil Melton — built with [Astro](https://astro.build) and deployed on [Cloudflare Workers](https://workers.cloudflare.com).

## Stack

| Layer | Technology |
| :------------ | :----------------------------------- |
| Framework | Astro 6 (SSR, Cloudflare adapter) |
| Styling | Tailwind CSS v4 |
| Deploy | Cloudflare Workers via Wrangler |
| Content | Astro content collections |
| Runtime | `@astrojs/cloudflare` |

## Project Structure

```text
/
├── public/              # Static assets (favicon, fonts)
├── src/
│   ├── components/      # Astro components (TechCard, StatusFeed, etc.)
│   ├── content/         # Content collection entries (.md files)
│   │   ├── projects/
│   │   ├── recipes/
│   │   ├── writing/
│   │   └── posts/
│   ├── layouts/         # Base page layouts
│   ├── pages/           # File-based routes
│   └── content.config.ts  # Active content collection schemas
├── wrangler.jsonc       # Cloudflare Workers config
└── package.json
```

## Local Development

```sh
# Install dependencies
npm install

# Start dev server (localhost:4321)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy to Cloudflare Workers
npx wrangler deploy
```

## Environment Variables

Runtime secrets are stored as **Cloudflare Worker secrets** — never committed to the repo.

| Secret | Purpose | How to set |
| :------------- | :---------------------------------------------- | :------------------------------------ |
| `GITHUB_TOKEN` | Authenticated GitHub API requests (commit feed) | `npx wrangler secret put GITHUB_TOKEN` |

To create the token: GitHub → Settings → Developer settings → Fine-grained tokens.
Grant **Contents: Read-only** on the `sybilsedge/sybilsedge` repository.

> Secrets set via `wrangler secret put` are automatically available at runtime —
> no entry in `wrangler.jsonc` is required.

## Content Collections

All content lives in `src/content/` as Markdown files. Schemas are defined in `src/content.config.ts`.

| Collection | Path | Key fields |
| :--------- | :-------------------------- | :--------------------------------------- |
| `projects` | `src/content/projects/` | `category`, `status`, `featured`, `progress` |
| `recipes` | `src/content/recipes/` | `category`, `featured` |
| `writing` | `src/content/writing/` | `status`, `wordCount`, `chapterStatus` |
| `posts` | `src/content/posts/` | `draft`, `featured` |

To feature a project in the Maker Gallery, set `featured: true` and optionally add a `progress` value (0–100) in the frontmatter.

## Open Issues

- **#60** — Migrate `GITHUB_TOKEN` access from `import.meta.env` to `Astro.locals.runtime.env`
- **#61** — Investigate Cloudflare Cache/KV caching for the GitHub commit feed
