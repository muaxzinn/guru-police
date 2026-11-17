const isGithubPages = process.env.GITHUB_PAGES === '1';
const basePath = isGithubPages ? process.env.NEXT_PUBLIC_BASE_PATH || '/naisibpro' : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  ...(isGithubPages
    ? {
        output: 'export',
        trailingSlash: true,
        basePath,
      }
    : {
        async headers() {
          return [
            {
              source: '/question-svgs/:path*',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable',
                },
              ],
            },
            {
              source: '/question-images/:path*',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=31536000, immutable',
                },
              ],
            },
          ];
        },
      }),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
