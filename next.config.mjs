/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // See https://webpack.js.org/configuration/resolve/#resolvealias
    config.resolve.alias = {
      ...config.resolve.alias,
      'sharp$': false,
      'onnxruntime-node$': false,
      'mongodb-client-encryption$': false,
      'aws4$': false,
      'snappy$': false,
      '@aws-sdk/credential-providers$': false,
      'kerberos$': false,
      '@mongodb-js/zstd$': false,
      'snappy/package.json$': false,
    }
    return config
  },
  watchOptions: {
    ignored: [
      '**/backend/**',
    ]
  },
};

export default nextConfig;
