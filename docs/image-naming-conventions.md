# Image Naming Conventions

This document defines the directory layout, file naming patterns, and format rules
for all images used on sybilsedge.com. Following these conventions keeps the build
pipeline predictable and makes content easy to locate as the library grows.

---

## 1. Directory Structure

```
src/assets/
├── images/
│   ├── posts/          # Hero images for blog posts (content/posts/)
│   ├── projects/       # Hero and gallery images for projects (content/projects/)
│   ├── recipes/        # Hero and gallery images for recipes (content/recipes/)
│   └── writing/        # Cover images for writing entries (content/writing/)
├── background.svg      # Site-level SVG assets (not content images)
└── astro.svg

public/
├── favicon.ico         # Favicons — static, not processed by Astro
└── favicon.svg

dist/client/og/         # ← build output only, never committed
    default.png         # Generated OG images (scripts/generate-og.mjs)
    home.png
    about.png
    …
```

**Rules:**

- All content images live under `src/assets/images/{collection}/`.
- Astro's `image()` schema helper validatesthese paths and provides image metadata at build time; optimisation happens when images are rendered through Astro's image pipeline.
- `public/` is for static files that bypass the image pipeline (favicons, `robots.txt`).
- `dist/` is build output — it is git-ignored and must not be committed.

---

## 2. Source File Naming

### Pattern

```
{collection-slug}--{descriptor}.{ext}
```

| Segment | Description | Example |
|---|---|---|
| `{collection-slug}` | The slug of the content entry this image belongs to | `deck` |
| `{descriptor}` | Short, lowercase, hyphenated description of the subject | `board-replacement` |
| `{ext}` | Source format — see §3 | `jpg` |

**Full example:** `deck--board-replacement.jpg`

### Rules

- Use lowercase kebab-case throughout — no spaces, no underscores, no camelCase.
- Keep descriptors short (1–4 words) but specific enough to identify the image without
  opening it.
- The double-dash (`--`) separator distinguishes the entry slug from the descriptor and
  makes both segments grep-friendly.
- For gallery sequences, append a zero-padded index after the descriptor:
  `deck--sanding-floor--01.jpg`, `deck--sanding-floor--02.jpg`.
- Device-generated names (e.g. `20260414_185940.jpg`) should be renamed to follow this
  convention before committing.

### Examples by Collection

| Collection | Field | Example filename |
|---|---|---|
| `posts` | `heroImage` | `sybilsedge-site--hero.jpg` |
| `projects` | `image` (hero) | `deck--board-replacement.jpg` |
| `projects` | `images[]` (gallery) | `deck--sanding-floor--01.jpg` |
| `recipes` | `image` (hero) | `sourdough-pizza-crust--baked.jpg` |
| `recipes` | `images[]` (gallery) | `sourdough-pizza-crust--dough-stretch--01.jpg` |
| `writing` | `coverImage` | `xaoc--cover.jpg` |

---

## 3. Format Rules

### Source files (committed to the repo)

| Use case | Format | Notes |
|---|---|---|
| Photos | **JPG** | Use for any photographic content |
| Screenshots / diagrams with transparency | **PNG** | Preserves sharp edges and alpha |
| Site-level illustrations | **SVG** | Store as SVG assets under `src/assets/` when needed. In `.astro` files, `set:html` is only for trusted, locally authored static inline SVG strings (for example, icon maps), not imported SVG asset files. |

Do not commit WebP or AVIF source files — Astro's image pipeline generates these
automatically at build time.

### Optimised output (generated at build time — do not commit)

The image pipeline produces the following optimised variants automatically:

| Component | Output formats | Output widths |
|---|---|---|
| `ContentHero.astro` (`<Picture>`) | AVIF + WebP | 600 px, 900 px, 1 200 px |
| `buildGalleryItems()` thumbnail | WebP | 400 px |
| `buildGalleryItems()` full | WebP | 1 200 px |

Astro appends a content-hash and width suffix to the output filename
(e.g. `deck--board-replacement_AbC123_600w.webp`). You do not need to
encode width in the source filename.

---

## 4. Open Graph Images

OG images are generated at build time by `scripts/generate-og.mjs` and written to
`dist/client/og/`. They are **not** sourced from `src/assets/`.

### Naming

```
{page-slug}.png
```

| Slug | Page |
|---|---|
| `default` | Fallback / root `<meta og:image>` |
| `home` | `/` |
| `about` | `/about` |
| `writing` | `/writing` |
| `projects` | `/projects` |
| `kitchen` | `/kitchen` |
| `resume` | `/resume` |

To add an OG image for a new page, add an entry to the `PAGES` array in
`scripts/generate-og.mjs`. The generator outputs `{filename}.png` at 1 200 × 630 px.

### OG image format

| Property | Value |
|---|---|
| Dimensions | 1 200 × 630 px |
| Format | PNG |
| Renderer | Satori (React → SVG) + Resvg (SVG → PNG) |

---

## 5. Responsive Variant Suffixes

Responsive variants are **generated automatically** — you do not create or name them
manually. Here is how Astro names the output files for reference:

```
{original-name}_{hash}_{width}w.{format}
```

Example output for `deck--board-replacement.jpg`:

```
deck--board-replacement_3a8f2b_600w.avif
deck--board-replacement_3a8f2b_600w.webp
deck--board-replacement_3a8f2b_900w.avif
deck--board-replacement_3a8f2b_900w.webp
deck--board-replacement_3a8f2b_1200w.avif
deck--board-replacement_3a8f2b_1200w.webp
```

These live in `dist/client/_astro/` and are git-ignored.

---

## 6. Alt Text Guidelines

Every image field in a content schema requires an `alt` string. Follow these rules
when writing alt text:

- **Describe what is shown**, not the surrounding context.
  ✓ `"Deck floor after 80-grit orbital sanding — old paint fully removed."`
  ✗ `"Image of my deck"`
- **Do not start with** "Image of", "Photo of", or "Picture of" — screen readers
  already announce the element type.
- **For gallery images**, include the specific step or subject so the caption and alt
  are complementary rather than identical.
- **For hero/cover images**, keep alt text to one sentence (≤ 125 characters).
- **For purely decorative images** that add no information, use `alt=""` — but content
  images on this site are rarely purely decorative, so this should be uncommon.
- **For OG images**, alt text is not applicable — they are used only as social preview
  cards and are not rendered in the page DOM.

---

## 7. Checklist for Adding a New Image

1. Name the file using the `{collection-slug}--{descriptor}.{ext}` pattern.
2. Place it in `src/assets/images/{collection}/`.
3. Reference it in the content entry frontmatter using a path relative to the entry
   file (e.g. `../../assets/images/projects/deck--board-replacement.jpg`).
4. Provide a meaningful `alt` string — see §6.
5. Run `npm run build` locally to confirm Astro validates and processes the image
   without errors.
