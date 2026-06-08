import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const patches = [
  {
    label: "@blocksuite/affine-components context-menu checkbox icon import",
    targetPath: join(process.cwd(), "node_modules", "@blocksuite", "affine-components", "dist", "context-menu", "button.js"),
    replacements: [
      {
        broken: "import { CheckBoxCkeckSolidIcon, CheckBoxUnIcon, DoneIcon, } from '@blocksuite/icons/lit';",
        patched: "import { CheckBoxUnIcon as CheckBoxCkeckSolidIcon, CheckBoxUnIcon, DoneIcon, } from '@blocksuite/icons/lit';",
      },
    ],
  },
  {
    label: "@blocksuite/data-view boolean group checkbox icon import",
    targetPath: join(process.cwd(), "node_modules", "@blocksuite", "data-view", "dist", "core", "group-by", "renderer", "boolean-group.js"),
    replacements: [
      {
        broken: "import { CheckBoxCkeckSolidIcon, CheckBoxUnIcon } from'@blocksuite/icons/lit';",
        patched: "import { CheckBoxUnIcon as CheckBoxCkeckSolidIcon, CheckBoxUnIcon } from'@blocksuite/icons/lit';",
      },
      {
        broken: "import { CheckBoxCkeckSolidIcon, CheckBoxUnIcon } from '@blocksuite/icons/lit';",
        patched: "import { CheckBoxUnIcon as CheckBoxCkeckSolidIcon, CheckBoxUnIcon } from '@blocksuite/icons/lit';",
      },
    ],
  },
];

let patchedCount = 0;

for (const patch of patches) {
  if (!existsSync(patch.targetPath)) {
    continue;
  }

  let source = readFileSync(patch.targetPath, "utf8");
  let nextSource = source;

  for (const replacement of patch.replacements) {
    nextSource = nextSource.replace(replacement.broken, replacement.patched);
  }

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
