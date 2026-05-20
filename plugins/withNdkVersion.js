const { withProjectBuildGradle } = require('@expo/config-plugins');

const NDK_VERSION = '27.1.12297006';

module.exports = function withNdkVersion(config) {
  return withProjectBuildGradle(config, (config) => {
    const before = config.modResults.contents;

    if (before.includes('ndkVersion')) {
      config.modResults.contents = before.replace(
        /ndkVersion\s*=\s*['"][\d.]+['"]/g,
        `ndkVersion = "${NDK_VERSION}"`
      );
    } else {
      config.modResults.contents = before.replace(
        /buildToolsVersion\s*=\s*findProperty\([^)]+\)\s*\?\:\s*['"][^'"]+['"]/,
        (match) => `${match}\n        ndkVersion = findProperty('android.ndkVersion') ?: '${NDK_VERSION}'`
      );
    }

    if (config.modResults.contents === before) {
      throw new Error(
        `[withNdkVersion] Failed to inject ndkVersion=${NDK_VERSION} into android/build.gradle. ` +
        `Neither replace nor insert pattern matched. Inspect the template manually.`
      );
    }

    return config;
  });
};
