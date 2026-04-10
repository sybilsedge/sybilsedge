// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://sybilsedge.com',
  output: 'server',
  adapter: cloudflare({
    // Build-time image optimization — no Cloudflare Images binding needed
    imageService: 'compile',
  }),
  vite: {
    plugins: [tailwindcss()],
    // Prevent vite from externalizing node builtins needed by Content Collections
    ssr: {
      target: 'webworker',
      noExternal: true,
    },
  },
  integrations: [react(), sitemap()],

  // ---------------------------------------------------------------------------
  // SECURITY HEADERS — last updated 2026-04-10
  // Applied to all routes via source: '/(.*)'.
  //
  // IMPORTANT — CSP MAINTENANCE:
  // The Content-Security-Policy allowlist MUST be updated whenever a new
  // external resource is introduced. Failing to do so will silently block
  // the resource in production.
  //
  //   New external font   → add origin to style-src AND font-src
  //   New script CDN      → add origin to script-src
  //   New API / fetch     → add origin to connect-src
  //   New image CDN       → add origin to img-src
  //
  // After any CSP change, re-run Lighthouse Best Practices on the preview
  // URL to confirm the score remains at 100 before merging to main.
  // ---------------------------------------------------------------------------
  headers: [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            // Add new font CDNs to both style-src and font-src
            "style-src 'self' 'unsafe-inline' https://api.fontshare.com https://fonts.googleapis.com",
            "font-src 'self' https://api.fontshare.com https://fonts.gstatic.com data:",
            "img-src 'self' data: blob: https:",
            // Add new API origins here (e.g. https://api.example.com)
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "object-src 'none'",
            "base-uri 'self'",
          ].join('; '),
        },
        // Forces HTTPS for 1 year — do not reduce max-age once live
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains; preload',
        },
        // Isolates the top-level window from cross-origin popups
        {
          key: 'Cross-Origin-Opener-Policy',
          value: 'same-origin',
        },
        // Prevents the site from being embedded in iframes (clickjacking)
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        // Prevents MIME-type sniffing
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        // Controls how much referrer info is sent with requests
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        // Restricts access to sensitive browser APIs
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
      ],
    },
  ],
});
