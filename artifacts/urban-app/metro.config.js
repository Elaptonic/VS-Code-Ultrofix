const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /\.cache\/openid-client\/.*/,
  // Firebase ships transient temp files inside its package directory while
  // installed via pnpm; metro tries to watch them and throws ENOENT.
  /node_modules\/.pnpm\/.*@firebase.*\/.*_tmp_.*/,
  /node_modules\/.*@firebase.*_tmp_.*/,
  // react-native-maps creates a temp directory during install that Metro
  // tries to watch before it exists.
  /node_modules\/.pnpm\/react-native-maps.*_tmp_.*/,
  /node_modules\/react-native-maps.*_tmp_.*/,
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "react-native-maps") {
    return { type: "empty" };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
