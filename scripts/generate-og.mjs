/**
 * Build-time OG image generator for sybilsedge.com
 *
 * Runs after `astro build` via the build script:
 *   "build": "astro build && node scripts/generate-og.mjs"
 *
 * Reads page definitions below, renders each one with Satori
 * (React-to-SVG) + @resvg/resvg-js (SVG-to-PNG), and writes
 * the PNGs to dist/client/og/ so they are served as static assets.
 *
 * To add a new OG image: add an entry to the PAGES array.
 */

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../dist/client/og');
mkdirSync(OUT_DIR, { recursive: true });

// ── FONT LOADING ─────────────────────────────────────────────────────────────
let orbitronFont, interFont;
try {
  orbitronFont = readFileSync(
    resolve(__dirname, '../node_modules/@fontsource/orbitron/files/orbitron-latin-700-normal.woff')
  );
} catch {
  orbitronFont = null;
}
try {
  interFont = readFileSync(
    resolve(__dirname, '../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff')
  );
} catch {
  interFont = null;
}

const fonts = [];
if (orbitronFont) fonts.push({ name: 'Orbitron', data: orbitronFont, weight: 700, style: 'normal' });
if (interFont) fonts.push({ name: 'Inter', data: interFont, weight: 400, style: 'normal' });

if (fonts.length === 0) {
  console.error('og: ERROR — no fonts loaded. Check @fontsource/orbitron and @fontsource/inter are installed.');
  process.exit(1);
}

console.log(`og: loaded ${fonts.map(f => f.name).join(', ')}`);

// ── DESIGN TOKENS ────────────────────────────────────────────────────────────
const BG = '#080c10';
const CYAN = '#67e8f9';
const CYAN_DIM = 'rgba(103,232,249,0.5)';
const MUTED = 'rgba(226,232,240,0.55)';
const BORDER = 'rgba(103,232,249,0.25)';
const FONT_DISPLAY = orbitronFont ? 'Orbitron' : 'Inter';
const FONT_BODY = interFont ? 'Inter' : 'Orbitron';

// ── GRID PATTERN (inline SVG data URI) ───────────────────────────────────────
const GRID_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">'
  + '<path d="M0 0h40v40H0z" fill="none"/>'
  + '<path d="M0 0v40M40 0v40M0 0h40M0 40h40" stroke="rgba(103,232,249,0.06)" stroke-width="0.5"/>'
  + '</svg>'
)}`;

// ── OG CARD COMPONENT ────────────────────────────────────────────────────────
// NOTE: Satori requires display:flex on every element with more than one child.
function OgCard({ title, description, label, section }) {
  const titleSize = title.length > 30 ? '52px' : '64px';

  return {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: BG,
        backgroundImage: `url(${GRID_SVG})`,
        padding: '56px 64px',
        position: 'relative',
        fontFamily: FONT_BODY,
      },
      children: [
        // Top border accent line
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: '3px',
              background: `linear-gradient(90deg, ${CYAN} 0%, transparent 100%)`,
              display: 'flex',
            },
            children: [],
          },
        },
        // Left border accent line
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0, left: 0, bottom: 0,
              width: '3px',
              background: `linear-gradient(180deg, ${CYAN} 0%, transparent 100%)`,
              display: 'flex',
            },
            children: [],
          },
        },
        // Main content
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              justifyContent: 'center',
              gap: '20px',
            },
            children: [
              // Label (optional)
              ...(label ? [{
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontFamily: FONT_BODY,
                    fontSize: '13px',
                    fontWeight: 400,
                    letterSpacing: '0.22em',
                    color: CYAN_DIM,
                  },
                  children: [label.toUpperCase()],
                },
              }] : []),
              // Title
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontFamily: FONT_DISPLAY,
                    fontSize: titleSize,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: CYAN,
                    lineHeight: 1.1,
                  },
                  children: [title.toUpperCase()],
                },
              },
              // Description
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontFamily: FONT_BODY,
                    fontSize: '22px',
                    fontWeight: 400,
                    color: MUTED,
                    lineHeight: 1.5,
                    maxWidth: '900px',
                  },
                  children: [description],
                },
              },
            ],
          },
        },
        // Footer row
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '24px',
              borderTop: `1px solid ${BORDER}`,
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontFamily: FONT_BODY,
                    fontSize: '14px',
                    letterSpacing: '0.18em',
                    color: CYAN_DIM,
                  },
                  children: [(section ?? 'sybilsedge.com').toUpperCase()],
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontFamily: FONT_DISPLAY,
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    color: CYAN,
                  },
                  children: ['SYBILSEDGE.COM'],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

// ── PAGE DEFINITIONS ─────────────────────────────────────────────────────────
const PAGES = [
  {
    filename: 'default',
    title: "Builder's Console",
    description: 'Writer, cloud architect, maker, and cook — the digital identity of Sybil Melton.',
    label: 'Personal Operations Center',
    section: 'sybilsedge.com',
  },
  {
    filename: 'home',
    title: "Builder's Console",
    description: 'Status Hub, Maker Gallery, and The Lab — live feed of digital builds, physical craft, and experimental output.',
    label: 'Personal Operations Center',
    section: 'sybilsedge.com',
  },
  {
    filename: 'about',
    title: 'About',
    description: 'Cloud architect, fiction writer, maker. Building things in the physical and digital world.',
    label: 'Identity Record',
    section: 'About',
  },
  {
    filename: 'writing',
    title: 'Writing',
    description: 'Fiction portfolio — sci-fi thrillers, works in progress, and anything else that escapes the terminal at night.',
    label: 'Portfolio',
    section: 'Writing',
  },
  {
    filename: 'projects',
    title: 'Projects',
    description: 'Tech builds, home projects, and garden experiments — documented from start to finish.',
    label: 'Maker Gallery',
    section: 'Projects',
  },
  {
    filename: 'kitchen',
    title: 'Kitchen',
    description: 'Sourdough, pizza dough, preservation, and everything in between — recipes from the lab.',
    label: 'Culinary Archive',
    section: 'Kitchen',
  },
  {
    filename: 'resume',
    title: 'Resume',
    description: 'Senior cloud architect with 19+ years building complex IT solutions across cloud, networking, security, and observability.',
    label: 'Career Record',
    section: 'Resume',
  },
];

// ── RENDER LOOP ──────────────────────────────────────────────────────────────
for (const page of PAGES) {
  const element = OgCard(page);
  const svg = await satori(element, {
    width: 1200,
    height: 630,
    fonts,
  });
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  });
  const png = resvg.render().asPng();
  const outPath = resolve(OUT_DIR, `${page.filename}.png`);
  writeFileSync(outPath, png);
  console.log(`og: generated ${page.filename}.png`);
}

console.log(`og: all images written to dist/client/og/`);
