// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for pnpm symlinks
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    ...(config.resolver?.nodeModulesPaths || []),
    // Support pnpm's node_modules structure
    require('path').resolve(__dirname, 'node_modules'),
  ],
};

module.exports = config;
