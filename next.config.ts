import type { NextConfig } from 'next';

// Demo build (NEXT_PUBLIC_DEMO=1): static export for GitHub Pages, data in the visitor's browser.
// Real installation: Vercel server, Supabase, and the `route.server.ts` API handlers (excluded from the static export).
const demo = process.env.NEXT_PUBLIC_DEMO === '1';

const config: NextConfig = {
  ...(demo ? { output: 'export', trailingSlash: true, basePath: process.env.NEXT_PUBLIC_BASE_PATH || '' } : {}),
  pageExtensions: demo ? ['tsx', 'ts'] : ['tsx', 'ts', 'server.ts'],
  images: { unoptimized: true },
};

export default config;
