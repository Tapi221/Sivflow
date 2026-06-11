const path = require("node:path");

const rootDir = path.resolve(__dirname, "..", "..");
const functionsDir = path.join(rootDir, "functions");
const manifestPath = path.join(functionsDir, "functions.yaml");

process.env.FUNCTIONS_CONTROL_API = "true";
process.env.FUNCTIONS_MANIFEST_OUTPUT_PATH = manifestPath;
process.chdir(functionsDir);

require(path.join(functionsDir, "node_modules", "firebase-functions", "lib", "bin", "firebase-functions.js"));
