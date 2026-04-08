# Copilot Instructions for sybilsedge

This is a personal portfolio and dashboard site for Sybil Melton — writer, cloud architect, maker, and cook.

## Stack

- **Framework:** Astro v6 (`output: 'server'`) with the `@astrojs/cloudflare` adapter — deployed as a Cloudflare Worker
- **UI layer:** React 19 for interactive islands; `.astro` components everywhere else
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite` — there is no `tailwind.config.js`; all config lives in CSS or `vite.plugins`
- **TypeScript** throughout; strict mode is expected
- **Icons in React:** `lucide-react` (e.g., `AlertTriangle`, `CheckCircle2`)
- **Icons in `.astro`:** inline SVG strings rendered with Astro's `set:html` directive — this is intentional and not an XSS risk because all SVGs are locally authored

## Conventions

### Components
- Static/layout components → `.astro` files in `src/components/`
- Interactive components → `.tsx` files in `src/components/`, mounted with a `client:*` directive (prefer `client:visible` for below-the-fold islands)
- All pages use the `Layout.astro` wrapper and should pass `title`, `description`, and optionally `image` props for SEO

### Icons in `.astro` files
Icons are stored as inline SVG strings in a `Record<string, string>` map and rendered via `<span set:html={icons[key]} />`. New icons should follow this pattern — do not introduce `<img>` tags or external icon component libraries in `.astro` files.

### Styling
- Use Tailwind utility classes; avoid inline `style` attributes unless Tailwind cannot express the value
- Typography scale: `font-orbitron` for headings/wordmarks, `font-tech` for labels and metadata, standard sans for body prose
- Neon accent color: `#39ff14` (neon green) and `cyan-300` family — keep additions consistent with the dark terminal aesthetic

### Content Collections
Content schemas are defined with Zod in `src/content.config.ts`. There are four collections: `writing`, `projects`, `recipes`, `posts`. When adding a new collection or field:
- Follow the existing `defineCollection` + `z.object()` pattern
- Use `.optional()` for fields that may not be present on every entry
- Use `z.enum([...])` for fields with a fixed set of values

### Cloudflare Workers constraints
The SSR adapter targets `webworker` (`vite.ssr.target: 'webworker'`). Flag any code that uses Node-only APIs (`fs`, `path`, `crypto` from Node, `process.env` without a Cloudflare-compatible shim, etc.) — these will break at runtime on the edge.

## What to skip reviewing
- `README.md` — this is the unmodified Astro starter template and is not kept up to date
- `package-lock.json` diffs — no review needed unless a specific dependency concern is raised
