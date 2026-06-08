import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const checkboxIconImportReplacement = {
  broken: /import\s*\{\s*CheckBoxCkeckSolidIcon,\s*CheckBoxUnIcon\s*\}\s*from\s*['"]@blocksuite\/icons\/lit['"];?/g,
  patched: "import { CheckBoxUnIcon as CheckBoxCkeckSolidIcon, CheckBoxUnIcon } from '@blocksuite/icons/lit';",
};
const patches = [
  {
    label: "@blocksuite/affine-components context-menu checkbox icon import",
    targetPath: join(repoRoot, "node_modules", "@blocksuite", "affine-components", "dist", "context-menu", "button.js"),
    replacements: [
      {
        broken: /import\s*\{\s*CheckBoxCkeckSolidIcon,\s*CheckBoxUnIcon,\s*DoneIcon,?\s*\}\s*from\s*['"]@blocksuite\/icons\/lit['"];?/g,
        patched: "import { CheckBoxUnIcon as CheckBoxCkeckSolidIcon, CheckBoxUnIcon, DoneIcon } from '@blocksuite/icons/lit';",
      },
    ],
  },
  {
    label: "@blocksuite/data-view boolean group checkbox icon import",
    targetPath: join(repoRoot, "node_modules", "@blocksuite", "data-view", "dist", "core", "group-by", "renderer", "boolean-group.js"),
    replacements: [checkboxIconImportReplacement],
  },
  {
    label: "@blocksuite/data-view checkbox cell renderer checkbox icon import",
    targetPath: join(repoRoot, "node_modules", "@blocksuite", "data-view", "dist", "property-presets", "checkbox", "cell-renderer.js"),
    replacements: [checkboxIconImportReplacement],
  },
];

const applyReplacements = (source, replacements) => {
  return replacements.reduce((nextSource, replacement) => nextSource.replace(replacement.broken, replacement.patched), source);
};

let patchedCount = 0;

for (const patch of patches) {
  if (!existsSync(patch.targetPath)) {
    continue;
  }

  const source = readFileSync(patch.targetPath, "utf8");
  const nextSource = applyReplacements(source, patch.replacements);

  if (nextSource === source) {
    continue;
  }

  writeFileSync(patch.targetPath, nextSource);
  patchedCount += 1;
  console.log(`Patched ${patch.label}.`);
}

if (patchedCount === 0) {
  console.log("No BlockSuite checkbox icon import patch was needed.");
}
