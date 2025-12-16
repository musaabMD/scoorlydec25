/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer, webpack }) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    
    // Handle Tesseract.js workers
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    
    return config;
  },
}

module.exports = nextConfig

