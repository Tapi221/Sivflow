import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repositoryRoot = resolve(__dirname, "..");
const sourceIconPath = resolve(repositoryRoot, "shared/assets/icons/app-icon.svg");
const publicIconPath = resolve(repositoryRoot, "public/icon.svg");
const shouldCheck = process.argv.includes("--check");

const normalizeSvg = (value) => value.replace(/\r\n/g, "\n").trimEnd();

const sourceIcon = await readFile(sourceIconPath, "utf8");
let publicIcon = "";

try {
  publicIcon = await readFile(publicIconPath, "utf8");
} catch (error) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
    throw error;
  }
}

if (normalizeSvg(sourceIcon) === normalizeSvg(publicIcon)) {
  console.log("public/icon.svg is in sync with shared/assets/icons/app-icon.svg.");
  process.exit(0);
}

if (shouldCheck) {
  console.error("public/icon.svg is out of sync with shared/assets/icons/app-icon.svg. Run npm run sync:app-icon.");
  process.exit(1);
}

await writeFile(publicIconPath, sourceIcon, "utf8");
console.log("Synced public/icon.svg from shared/assets/icons/app-icon.svg.");
