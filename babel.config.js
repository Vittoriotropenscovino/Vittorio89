module.exports = function (api) {
    api.cache(true);
    return {
        // babel-preset-expo (SDK 54) adds `react-native-reanimated/plugin`
        // automatically when the package is installed, so declaring it here as
        // well would apply it twice.
        presets: ['babel-preset-expo'],
    };
};
