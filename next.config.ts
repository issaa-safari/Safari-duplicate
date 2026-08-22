import type { NextConfig } from "next";

// Dev-only allowance so impeccable live mode can load.
const __impeccableLiveDev =
  process.env.NODE_ENV === "development" ? " http://localhost:8400" : "";

// Dev-only allowances for the offline Supabase emulator (scripts/dev-backend.mjs).
// Without them the CSP blocks the very thing scripts/dev-backend.md promises:
// script-src has no 'unsafe-eval', which React needs in development, so no
// client handler runs and every form falls back to a plain GET; and connect-src
// has no localhost origin, so the emulator is unreachable from the browser.
// Both are gated on NODE_ENV, so the production policy is unchanged.
const __devEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
const __devBackend =
  process.env.NODE_ENV === "development"
    ? " http://127.0.0.1:54321 http://localhost:54321 ws://127.0.0.1:3000 ws://localhost:3000"
    : "";

const csp = [
  "default-src 'self'",
  "img-src 'self' https: data:",
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com${__impeccableLiveDev}${__devEval}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  // GA4 sends hits to the regional google-analytics.com collectors and, for
  // some configurations, analytics.google.com; gtag.js also fetches its own
  // config from googletagmanager.com.
  `connect-src 'self' https://*.supabase.co https://*.supabase.in https://va.vercel-scripts.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com${__impeccableLiveDev}${__devBackend}`,
  "frame-src 'self' https://www.instagram.com https://www.tiktok.com https://www.youtube.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ]
  },
};

export default nextConfig;
