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
// We embed base64 fonts so the generator works in CI without a network call.
// Orbitron (display) + Inter (body) — both open source, loaded from node_modules
// or falling back to a system font if unavailable.
let orbitronFont, interFont;
try {
  orbitronFont = readFileSync(
    resolve(__dirname, '../node_modules/@fontsource/orbitron/files/orbitron-latin-700-normal.woff')
  );
} catch {
  // Fallback: satori will use its built-in sans-serif
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
if (interFont)   fonts.push({ name: 'Inter',    data: interFont,    weight: 400, style: 'normal' });

// ── DESIGN TOKENS ────────────────────────────────────────────────────────────
const BG       = '#080c10';
const SURFACE  = '#0d1117';
const CYAN     = '#67e8f9';
const CYAN_DIM = 'rgba(103,232,249,0.5)';
const TEXT     = '#e2e8f0';
const MUTED    = 'rgba(226,232,240,0.55)';
const BORDER   = 'rgba(103,232,249,0.25)';
const FONT_DISPLAY = orbitronFont ? 'Orbitron' : 'sans-serif';
const FONT_BODY    = interFont    ? 'Inter'    : 'sans-serif';

// ── GRID PATTERN (inline SVG data URI) ───────────────────────────────────────
// Blueprint crosshatch grid rendered as a background image.
const GRID_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">'
  + '<path d="M0 0h40v40H0z" fill="none"/>'
  + '<path d="M0 0v40M40 0v40M0 0h40M0 40h40" stroke="rgba(103,232,249,0.06)" stroke-width="0.5"/>'
  + '</svg>'
)}`;

// ── OG CARD COMPONENT ────────────────────────────────────────────────────────
/**
 * @param {object} opts
 * @param {string} opts.title       - Main heading
 * @param {string} opts.description - Subheading / description
 * @param {string} [opts.label]     - Small all-caps label above title (e.g. 'Portfolio')
 * @param {string} [opts.section]   - Bottom-left section indicator
 */
function OgCard({ title, description, label, section }) {
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
              // Label
              label ? {
                type: 'div',
                props: {
                  style: {
                    fontFamily: FONT_BODY,
                    fontSize: '13px',
                    fontWeight: 400,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: CYAN_DIM,
                  },
                  children: [label],
                },
              } : null,
              // Title
              {
                type: 'div',
                props: {
                  style: {
                    fontFamily: FONT_DISPLAY,
                    fontSize: title.length > 30 ? '52px' : '64px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: CYAN,
                    lineHeight: 1.1,
                  },
                  children: [title],
                },
              },
              // Description
              {
                type: 'div',
                props: {
                  style: {
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
            ].filter(Boolean),
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
                    fontFamily: FONT_BODY,
                    fontSize: '14px',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: CYAN_DIM,
                  },
                  children: [section ?? 'sybilsedge.com'],
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontFamily: FONT_DISPLAY,
                    fontSize: '14px',
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
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
// Each entry produces one PNG at dist/client/og/<filename>.png
// To add more pages, append to this array.
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
    description: 'Fiction portfolio — spy thrillers, works in progress, and anything else that escapes the terminal at night.',
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
    description: 'Senior cloud architect with 17+ years building complex IT solutions across cloud, networking, security, and observability.',
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
