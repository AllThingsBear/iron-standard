import type { NextConfig } from 'next';
// NEXT_DIST_DIR lets the desktop build use its own output folder without touching a running dev server's .next
const config: NextConfig = { output: 'standalone', serverExternalPackages: ['better-sqlite3'], distDir: process.env.NEXT_DIST_DIR || '.next' };
export default config;
