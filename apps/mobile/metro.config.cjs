const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules"), path.resolve(workspaceRoot, "node_modules")];
config.resolver.extraNodeModules = {
  "@": path.resolve(workspaceRoot, "src"),
  "@constants": path.resolve(workspaceRoot, "constants"),
  "@mobile": path.resolve(projectRoot, "src"),
};

module.exports = config;
