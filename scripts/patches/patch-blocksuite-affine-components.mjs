import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const targetPath = join(process.cwd(), "node_modules", "@blocksuite", "affine-components", "dist", "context-menu", "button.js");
const brokenImport = "import { CheckBoxCkeckSolidIcon, CheckBoxUnIcon, DoneIcon, } from '@blocksuite/icons/lit';";
const patchedImport = "import { CheckBoxUnIcon as CheckBoxCkeckSolidIcon, CheckBoxUnIcon, DoneIcon, } from '@blocksuite/icons/lit';";

if (!existsSync(targetPath)) {
  process.exit(0);
}

const source = readFileSync(targetPath, "utf8");

if (source.includes(patchedImport)) {
  process.exit(0);
}

if (!source.includes(brokenImport)) {
  process.exit(0);
}

writeFileSync(targetPath, source.replace(brokenImport, patchedImport));
console.log("Patched @blocksuite/affine-components context-menu checkbox icon import.");
