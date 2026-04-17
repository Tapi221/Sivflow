import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const npmCommand = "npm";

const generatedTargets = [
  "src/presentation/react/theme/design-tokens.css",
  "src/presentation/react/theme/design-tokens.ts",
  "src/presentation/react/theme/index.ts",
  "ios/App/DesignSystem/Tokens/GeneratedDesignTokens.swift",
  "android/app/src/main/java/com/akari221/flashcardmaster/designsystem/tokens/GeneratedDesignTokens.kt",
];

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
];

const filesThatMustBeTokenDriven = [
  "tailwind.config.js",
  "src/styles/components/common.css",
  "src/components/card/panels/MetaPanelShell.tsx",
];

const fail = (message) => {
  console.error(`[verify-design-tokens] FAIL: ${message}`);
  process.exit(1);
};

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(" ")}`);
  }
};

const read = (relativePath) => {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing file: ${relativePath}`);
  }

  return fs.readFileSync(absolutePath, "utf8").toLowerCase();
};

run(npmCommand, ["run", "design-tokens:build"]);

const diffResult = spawnSync(
  "git",
  ["diff", "--exit-code", "--", ...generatedTargets],
  {
    stdio: "inherit",
    shell: false,
  },
);

if (diffResult.status !== 0) {
  fail(
    "Generated design-token outputs are stale. Run `npm run design-tokens:build` and commit the updated generated files.",
  );
}

for (const relativePath of filesThatMustBeTokenDriven) {
  const source = read(relativePath);

  for (const literal of forbiddenCoreThemeLiterals) {
    if (source.includes(literal)) {
      fail(
        `${relativePath} still contains raw core theme literal ${literal}. Move the value into design tokens and consume the generated variable instead.`,
      );
    }
  }
}

console.log("[verify-design-tokens] OK");
