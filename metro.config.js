// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Required for Three.js compatibility
config.resolver.sourceExts.push('cjs');

// Include HTML files as assets (for globe.html)
config.resolver.assetExts.push('html');

module.exports = config;
