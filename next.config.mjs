/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep route bundles hot in dev so pages stay loaded after first compile.
  // Note: Next.js still compiles routes on first request in dev mode.
  onDemandEntries: {
    maxInactiveAge: 24 * 60 * 60 * 1000, // 24 hours
    pagesBufferLength: 9999,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
    ],
  },
  serverExternalPackages: ['mysql2', 'exceljs'],
};

export default nextConfig;
