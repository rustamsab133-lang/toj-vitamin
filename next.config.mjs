/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the development server usable while a production build runs.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  reactStrictMode: true,
  eslint: {
    // ignoreDuringBuilds: true,
  },
  typescript: {
    // ignoreBuildErrors: true,
  },
  staticPageGenerationTimeout: 180,
  swcMinify: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async redirects() {
    return [
      {
        source: '/b/:blogger',
        destination: '/?utm_source=:blogger&utm_medium=shortlink&utm_campaign=blogger',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
