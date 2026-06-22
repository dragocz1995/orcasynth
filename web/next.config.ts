import type { NextConfig } from 'next';
import path from 'path';
const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // The same-origin daemon proxy is now the `app/api/[...path]` route handler, which (unlike a plain
  // rewrite) injects the daemon bearer from the httpOnly session cookie server-side. No rewrite needed.
};
export default nextConfig;
