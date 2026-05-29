const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const projectNodeModules = path.resolve(projectRoot, "node_modules");
const workspaceNodeModules = path.resolve(workspaceRoot, "node_modules");

const config = getDefaultConfig(projectRoot);

const resolveFromProject = (moduleName) => path.resolve(projectNodeModules, moduleName);

config.watchFolders = [workspaceRoot];
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [projectNodeModules, workspaceNodeModules];
config.resolver.extraNodeModules = {
  "@": path.resolve(workspaceRoot, "src"),
  "@constants": path.resolve(workspaceRoot, "constants"),
  "@core": path.resolve(workspaceRoot, "packages/core/src"),
  "@mobile": path.resolve(projectRoot, "src"),
  "@mobile-renderer": path.resolve(workspaceRoot, "packages/mobile-renderer/src"),
  "@shared": path.resolve(workspaceRoot, "shared"),
  react: resolveFromProject("react"),
  "react-dom": resolveFromProject("react-dom"),
  "react-native": resolveFromProject("react-native"),
  "react-native-safe-area-context": resolveFromProject("react-native-safe-area-context"),
};

module.exports = config;