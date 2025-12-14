/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer, webpack }) => {
    // #region agent log
    const fs = require('fs');
    const path = require('path');
    const logPath = path.join(__dirname, '.cursor', 'debug.log');
    try {
      const logData = JSON.stringify({
        location: 'next.config.js:webpack',
        message: 'Webpack config executed',
        data: { isServer, outputPath: config.output?.path, publicPath: config.output?.publicPath },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'B'
      }) + '\n';
      fs.appendFileSync(logPath, logData);
    } catch (e) {}
    // #endregion
    
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

