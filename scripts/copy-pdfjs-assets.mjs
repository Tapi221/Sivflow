import { access, cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const ensureExists = async (target) => {
  await access(target);
};

const copyDir = async (from, to) => {
  await mkdir(path.dirname(to), { recursive: true });
  await cp(from, to, { recursive: true, force: true });
};

const run = async () => {
  const pdfjsRoot = path.join(rootDir, "node_modules", "pdfjs-dist");
  const cmapsSrc = path.join(pdfjsRoot, "cmaps");
  const fontsSrc = path.join(pdfjsRoot, "standard_fonts");
  const publicRoot = path.join(rootDir, "public", "pdfjs");

  await Promise.all([ensureExists(cmapsSrc), ensureExists(fontsSrc)]);

  await Promise.all([
    copyDir(cmapsSrc, path.join(publicRoot, "cmaps")),
    copyDir(fontsSrc, path.join(publicRoot, "standard_fonts")),
  ]);
};

await run();
