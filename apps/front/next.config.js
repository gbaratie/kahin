/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  transpilePackages: [
    '@kahin/qcm-domain',
    '@kahin/qcm-application',
    '@kahin/qcm-infrastructure',
  ],
};

module.exports = nextConfig;
