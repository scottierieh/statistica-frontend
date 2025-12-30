/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handlebars issue: require.extensions is not supported by webpack.
    // We can simply ignore this dependency.
    config.externals.push('handlebars');

    return config;
  },
  // Prevent Next.js from watching the backend directory to avoid excessive recompilations.
  watchOptions: {
    ignored: ['**/backend/**'],
  },
};

export default nextConfig;
