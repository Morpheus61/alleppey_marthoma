const withNextIntl = require('next-intl/plugin')('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'furbmmtqnrtaelryonlo.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // PWA via @serwist/next will be wired in Stage 8.
}

// Apply next-intl plugin (adds experimental.turbo.resolveAlias in next-intl v3)
const withIntlConfig = withNextIntl(nextConfig)

// Next.js 16 moved Turbopack config to top-level `turbopack` (not experimental.turbo).
// next-intl/plugin still writes to experimental.turbo, which Next.js 16 ignores.
// Override here with the correct top-level key so the alias is actually applied.
module.exports = {
  ...withIntlConfig,
  turbopack: {
    resolveAlias: {
      // Wire next-intl's runtime config lookup to our request config file
      'next-intl/config': './src/i18n/request.ts',
    },
  },
  // Ensure sw.js is served without caching so updates propagate immediately
  headers: async () => [
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
  ],
}
