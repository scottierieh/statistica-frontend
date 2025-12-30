/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'github.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    config.externals.push('handlebars');
    return config;
  },
  watchOptions: {
    ignored: ['**/backend/**'],
  },
};

export default nextConfig;