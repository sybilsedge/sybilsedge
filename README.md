# sybilsedge.com

Personal site for Sybil Melton — built with [Astro](https://astro.build) and deployed on [Cloudflare Workers](https://workers.cloudflare.com).

## Stack

| Layer | Technology |
| :------------ | :----------------------------------------- |
| Framework | Astro 6 (SSR, `@astrojs/cloudflare` v13) |
| UI islands | React 19 (`client:*` directive) |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Deploy | Cloudflare Workers via Wrangler |
| Content | Astro content collections (MDX) |
| AI | Cloudflare Workers AI + Durable Objects |

## Project Structure

```text
/
├── docs/                # Developer reference docs
├── public/              # Static assets (favicons, robots.txt, security headers)
│   └── _headers         # Cloudflare security headers (CSP, HSTS, etc.)
├── scripts/
│   ├── generate-og.mjs  # Build-time OG image generator (Satori + Resvg)
│   └── patch-wrangler.mjs  # Postbuild: injects AI/DO/R2 bindings into wrangler.json
├── src/
│   ├── agent/           # Digital Twin — SybilTwinDO, context builder, R2 KB loader
│   ├── assets/
│   │   └── images/      # Content images (processed by Astro's image pipeline)
│   │       ├── posts/
│   │       ├── projects/
│   │       ├── recipes/
│   │       └── writing/
│   ├── components/      # UI components (.astro static; .tsx interactive islands)
│   ├── content/         # Content collection entries (.mdx files)
│   │   ├── posts/
│   │   ├── projects/
│   │   ├── recipes/
│   │   └── writing/
│   ├── data/            # Static data modules (resume.ts, about.ts)
│   ├── layouts/         # Base page layouts
│   ├── pages/           # File-based routes
│   │   ├── api/agent.ts # POST /api/agent — Digital Twin AI endpoint
│   │   ├── agent.astro  # /agent — Digital Twin chat UI
│   │   ├── blog/        # /blog/[slug] — blog post detail pages
│   │   ├── kitchen/     # /kitchen + /kitchen/[slug] — recipe pages
│   │   └── projects/    # /projects + /projects/[slug] — project pages
│   ├── utils/           # Shared utilities (gallery image processing)
│   └── content.config.ts  # Content collection schemas (Zod)
├── wrangler.jsonc       # Cloudflare Workers config (prod)
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

## Environment Variables & Bindings

### Worker secrets (set via `wrangler secret put`)

| Secret | Purpose | How to set |
| :------------- | :---------------------------------------------- | :------------------------------------ |
| `GITHUB_TOKEN` | Authenticated GitHub API requests (commit feed) | `npx wrangler secret put GITHUB_TOKEN` |

To create the token: GitHub → Settings → Developer settings → Fine-grained tokens.
Grant **Contents: Read-only** on the `sybilsedge/sybilsedge` repository.

> Secrets set via `wrangler secret put` are automatically available at runtime —
> no entry in `wrangler.jsonc` is required.

### Cloudflare bindings (injected at deploy by `scripts/patch-wrangler.mjs`)

These bindings are **not** declared in the root `wrangler.jsonc` (to avoid
`@cloudflare/vite-plugin` remote proxy errors during build). The postbuild
script injects them into `dist/server/wrangler.json` before deployment.

| Binding | Type | Purpose |
| :------------- | :---------------------- | :----------------------------------------------- |
| `AI` | Workers AI | Powers the Digital Twin (`/agent`) chat responses |
| `SYBIL_TWIN` | Durable Object | Conversation persistence for SybilTwinDO |
| `SYBIL_TWIN_KB` | R2 Bucket (optional) | Private knowledge-base documents for Digital Twin context |

See [docs/r2-kb-runbook.md](docs/r2-kb-runbook.md) for how to populate the R2 knowledge-base bucket.

### Local development

To test the GitHub commit feed locally, create a `.dev.vars` file in the project root
(this file is git-ignored and must never be committed):

```sh
# .dev.vars — local secrets for `astro dev` / `wrangler dev`
# Use a fine-grained PAT (prefix: github_pat_), not a classic token (ghp_).
GITHUB_TOKEN=github_pat_...
```

`astro dev` picks this file up automatically via the `@astrojs/cloudflare` Vite plugin.
Without it, the commit feed will render without authentication (public repos still work
at GitHub's lower 60 req/hr rate limit).

## Content Collections

All content lives in `src/content/` as MDX files. Schemas are defined in `src/content.config.ts`.

| Collection | Path | Key fields |
| :--------- | :-------------------------- | :----------------------------------------------- |
| `posts` | `src/content/posts/` | `draft`, `featured`, `heroImage` |
| `projects` | `src/content/projects/` | `category`, `status`, `featured`, `progress`, `image`, `images[]` |
| `recipes` | `src/content/recipes/` | `category`, `featured`, `image`, `images[]` |
| `writing` | `src/content/writing/` | `status`, `wordCount`, `chapterStatus`, `coverImage` |

To feature a project in the Maker Gallery, set `featured: true` and optionally add a `progress` value (0–100) in the frontmatter.

Image fields (`image`, `images[]`, `heroImage`, `coverImage`) use Astro's `image()` schema helper — paths are validated at build time and optimised to AVIF + WebP by the image pipeline. See [docs/image-naming-conventions.md](docs/image-naming-conventions.md) for naming and placement rules.

## Digital Twin (`/agent`)

The `/agent` page hosts an AI-powered chat interface trained on Sybil's portfolio data.

| Component | Location | Description |
| :-------- | :------- | :---------- |
| Chat UI | `src/components/AgentChat.tsx` | React island (`client:load`) |
| API endpoint | `src/pages/api/agent.ts` | Streams responses from Workers AI via Durable Object |
| DO class | `src/agent/sybil-twin.ts` | `SybilTwinDO` — persists conversation history (SQLite) |
| System prompt | `src/agent/context.ts` | Builds prompt from local data + optional R2 KB context |
| KB loader | `src/agent/r2-context.ts` | Reads `.md` documents from `SYBIL_TWIN_KB` R2 bucket |

The DO class is bundled into the SSR Worker entry by a custom Vite plugin in `astro.config.mjs`. AI and DO bindings are injected into `dist/server/wrangler.json` by `scripts/patch-wrangler.mjs` at postbuild time.

## Developer Docs

| Document | Description |
| :------- | :---------- |
| [Image Naming Conventions](docs/image-naming-conventions.md) | Directory layout, file naming patterns, format rules, OG images, and alt text guidelines |
| [R2 KB Runbook](docs/r2-kb-runbook.md) | Authoring, uploading, and managing documents in the SybilTwin knowledge-base R2 bucket |

## Open Issues

- **#61** — Investigate Cloudflare Cache/KV caching for the GitHub commit feed
