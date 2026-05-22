import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const functionsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(functionsDir, "functions.yaml");
const discoveryBin = path.join(
  functionsDir,
  "node_modules",
  "firebase-functions",
  "lib",
  "bin",
  "firebase-functions.js",
);

const child = spawn(process.execPath, [discoveryBin], {
  cwd: functionsDir,
  env: {
    ...process.env,
    FUNCTIONS_CONTROL_API: "true",
    FUNCTIONS_MANIFEST_OUTPUT_PATH: manifestPath,
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Manifest generation was terminated by ${signal}.`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});
