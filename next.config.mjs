const isGithubPages = process.env.GITHUB_PAGES === '1';
const basePath = isGithubPages ? process.env.NEXT_PUBLIC_BASE_PATH || '/guru-police' : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isGithubPages
    ? {
        output: 'export',
        trailingSlash: true,
        basePath,
      }
    : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
