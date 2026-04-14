/**
 * generate-og.mjs
 * Runs after `astro build` to produce static OG PNG images.
 *
 * Output: dist/client/og/*.png
 *
 * Pages covered:
 *   /og/default.png        — fallback
 *   /og/home.png
 *   /og/about.png
 *   /og/projects.png
 *   /og/kitchen.png
 *   /og/writing.png
 *   /og/resume.png
 *   /og/project-{slug}.png — one per project entry
 *   /og/recipe-{slug}.png  — one per recipe entry
 *   /og/writing-{slug}.png — one per writing entry
 */

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { readdir } from 'node:fs/promises';

// ─── OUTPUT DIR ────────────────────────────────────────────────────────────
const OUT_DIR = resolve('dist/client/og');
mkdirSync(OUT_DIR, { recursive: true });

// ─── FONT ────────────────────────────────────────────────────────────────────
// Fetch Orbitron (display) and Inter (body) from Google Fonts CDN at build time.
async function fetchFont(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${url} → ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

console.log('generate-og: fetching fonts…');
const [orbitronBold, interRegular] = await Promise.all([
  fetchFont('https://fonts.gstatic.com/s/orbitron/v31/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1nyGy6BoWgz.woff'),
  fetchFont('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff'),
]);

const fonts = [
  { name: 'Orbitron', data: orbitronBold,  weight: 700, style: 'normal' },
  { name: 'Inter',    data: interRegular,  weight: 400, style: 'normal' },
];

// ─── BRAND COLOURS ───────────────────────────────────────────────────────
const C = {
  bg:        '#05080f',
  surface:   '#0a0f1a',
  border:    '#1e3a5f',
  cyan:      '#67e8f9',
  cyanDim:   '#22d3ee',
  cyanFaint: 'rgba(103,232,249,0.25)',
  white:     '#e2e8f0',
  muted:     '#94a3b8',
  dot:       'rgba(103,232,249,0.07)',
};

// ─── TEMPLATE ───────────────────────────────────────────────────────────
/**
 * Build a Satori JSX-compatible element tree for one OG image.
 * @param {object} opts
 * @param {string} opts.label    — small uppercase eyebrow (e.g. 'PROJECT')
 * @param {string} opts.title    — main heading
 * @param {string} opts.body     — subtitle / description (max ~100 chars)
 * @param {string} [opts.tag]    — optional pill tag (e.g. category)
 */
function ogElement({ label, title, body, tag }) {
  return {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: C.bg,
        padding: '0',
        position: 'relative',
        overflow: 'hidden',
      },
      children: [
        // Blueprint dot-grid background pattern
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              inset: '0',
              backgroundImage: `radial-gradient(circle, ${C.dot} 1px, transparent 1px)`,
              backgroundSize: '28px 28px',
            },
          },
        },
        // Top border accent line
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              height: '3px',
              background: `linear-gradient(90deg, transparent, ${C.cyanDim}, transparent)`,
            },
          },
        },
        // Content card
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              inset: '48px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: '8px',
              padding: '52px 60px',
            },
            children: [
              // Top section
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column', gap: '20px' },
                  children: [
                    // Eyebrow label
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: {
                                width: '24px',
                                height: '2px',
                                backgroundColor: C.cyanDim,
                              },
                            },
                          },
                          {
                            type: 'p',
                            props: {
                              style: {
                                fontFamily: 'Orbitron',
                                fontSize: '13px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.22em',
                                color: C.cyanDim,
                                margin: '0',
                              },
                              children: label,
                            },
                          },
                          ...(tag ? [{
                            type: 'div',
                            props: {
                              style: {
                                padding: '3px 10px',
                                border: `1px solid ${C.cyanFaint}`,
                                borderRadius: '4px',
                                fontFamily: 'Orbitron',
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.14em',
                                color: C.cyan,
                              },
                              children: tag,
                            },
                          }] : []),
                        ],
                      },
                    },
                    // Title
                    {
                      type: 'h1',
                      props: {
                        style: {
                          fontFamily: 'Orbitron',
                          fontSize: title.length > 40 ? '42px' : '54px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: C.white,
                          margin: '0',
                          lineHeight: '1.15',
                          maxWidth: '900px',
                        },
                        children: title,
                      },
                    },
                    // Body
                    {
                      type: 'p',
                      props: {
                        style: {
                          fontFamily: 'Inter',
                          fontSize: '22px',
                          fontWeight: 400,
                          color: C.muted,
                          margin: '0',
                          lineHeight: '1.55',
                          maxWidth: '820px',
                        },
                        children: body.length > 110 ? body.slice(0, 107) + '…' : body,
                      },
                    },
                  ],
                },
              },
              // Bottom row — domain watermark
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  },
                  children: [
                    {
                      type: 'p',
                      props: {
                        style: {
                          fontFamily: 'Orbitron',
                          fontSize: '15px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.2em',
                          color: C.cyanFaint,
                          margin: '0',
                        },
                        children: 'sybilsedge.com',
                      },
                    },
                    // Corner accent dots
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex', gap: '6px', alignItems: 'center' },
                        children: [
                          { type: 'div', props: { style: { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: C.cyanDim, opacity: '0.4' } } },
                          { type: 'div', props: { style: { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: C.cyanDim, opacity: '0.25' } } },
                          { type: 'div', props: { style: { width: '6px', height: '6px', borderRadius: '50%', backgroundColor: C.cyanDim, opacity: '0.1' } } },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

// ─── RENDER PNG ───────────────────────────────────────────────────────────
async function renderPng(filename, opts) {
  const svg = await satori(ogElement(opts), {
    width: 1200,
    height: 630,
    fonts,
  });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  const png = resvg.render().asPng();
  const outPath = join(OUT_DIR, filename);
  writeFileSync(outPath, png);
  console.log(`generate-og: ✓ ${filename}`);
}

// ─── STATIC PAGES ─────────────────────────────────────────────────────────
const staticPages = [
  {
    filename: 'default.png',
    label: 'sybilsedge.com',
    title: "Builder's Console",
    body: 'Writer, cloud architect, maker, and cook. Digital identity of Sybil Melton.',
  },
  {
    filename: 'home.png',
    label: 'Home',
    title: "Builder's Console",
    body: 'Status Hub, Maker Gallery, and The Lab — a live feed of digital builds, physical craft, and experimental output.',
  },
  {
    filename: 'about.png',
    label: 'About',
    title: 'About Sybil',
    body: 'Cloud architect, fiction writer, maker. 17+ years in IT — a human being with range.',
  },
  {
    filename: 'projects.png',
    label: 'Projects',
    title: 'Maker Projects',
    body: 'Tech builds, home improvement, and garden experiments — documented and in progress.',
  },
  {
    filename: 'kitchen.png',
    label: 'Kitchen',
    title: 'The Kitchen',
    body: 'Recipes, ferments, and culinary experiments — sourdough, pizza, preservation, and more.',
  },
  {
    filename: 'writing.png',
    label: 'Writing',
    title: 'The Writing',
    body: 'Near-future science fiction and cyberpunk thrillers. Current project: The Shadow Docket.',
  },
  {
    filename: 'resume.png',
    label: 'Resume',
    title: 'Resume',
    body: 'Senior Cloud Architect — GCP, networking, security, observability. 17+ years of complex IT solutions.',
  },
];

for (const page of staticPages) {
  await renderPng(page.filename, page);
}

// ─── CONTENT COLLECTION PAGES ──────────────────────────────────────────────────
// Read frontmatter directly from .md files — no Astro runtime needed.
import matter from 'gray-matter';

async function processCollection(dir, prefix, labelFn, titleFn, bodyFn, tagFn) {
  const fullDir = resolve(`src/content/${dir}`);
  if (!existsSync(fullDir)) return;
  let files;
  try { files = await readdir(fullDir); } catch { return; }
  for (const file of files) {
    if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue;
    const slug = file.replace(/\.mdx?$/, '');
    const raw = readFileSync(join(fullDir, file), 'utf-8');
    const { data } = matter(raw);
    await renderPng(`${prefix}-${slug}.png`, {
      label: labelFn(data),
      title: titleFn(data),
      body:  bodyFn(data),
      tag:   tagFn?.(data),
    });
  }
}

// Projects
await processCollection(
  'projects',
  'project',
  () => 'Project',
  (d) => d.title ?? 'Untitled Project',
  (d) => d.description ?? '',
  (d) => d.category ? d.category.toUpperCase() : undefined,
);

// Recipes
await processCollection(
  'recipes',
  'recipe',
  () => 'Kitchen',
  (d) => d.title ?? 'Untitled Recipe',
  (d) => d.description ?? '',
  (d) => d.category ? d.category.toUpperCase() : undefined,
);

// Writing
await processCollection(
  'writing',
  'writing',
  () => 'Writing',
  (d) => d.title ?? 'Untitled',
  (d) => d.synopsis ?? d.description ?? '',
  (d) => d.genre ?? undefined,
);

console.log('generate-og: all images written to dist/client/og/');
