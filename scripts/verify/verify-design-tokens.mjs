import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const forbiddenCoreThemeLiterals = [
  "#689a98",
  "#90b8b6",
  "#7bacaa",
  "#5a8684",
  "#e6f0ef",
  "#f7f7f8",
  "#202123",
  "#6e6e80",
  "#d9d9d9",
  "#8a8a8a",
  "#4f4f4f",
  "#777777",
];

const filesThatMustBeTokenDriven = [
  "tailwind.config.js",
  "src/styles/components/common.css",
  "src/components/card/panels/MetaPanelShell.tsx",
  "src/layout/AppLayout.css",
];

const fail = (message) => {
  console.error(`[verify-design-tokens] FAIL: ${message}`);
  process.exit(1);
};

const read = (relativePath) => {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing file: ${relativePath}`);
  }

  return fs.readFileSync(absolutePath, "utf8").toLowerCase();
};

for (const relativePath of filesThatMustBeTokenDriven) {
  const source = read(relativePath);

  for (const literal of forbiddenCoreThemeLiterals) {
    if (source.includes(literal)) {
      fail(
        `${relativePath} still contains raw core theme literal ${literal}. Move the value into theme files and consume the shared variable instead.`,
      );
    }
  }
}

console.log("[verify-design-tokens] OK");
