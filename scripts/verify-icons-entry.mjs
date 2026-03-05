import { execSync } from "node:child_process";

const checks = [
  {
    command:
      'rg -n "@flaticon/flaticon-uicons|from [\'\\"]lucide-react[\'\\"]" src',
    message: "Direct Flaticon or lucide imports remain in src.",
  },
  {
    command:
      'rg -n "from [\'\\"]/?.*icons/stratis[\'\\"]|export \\* from [\'\\"]/?.*icons/stratis[\'\\"]" src -g "!src/ui/icons.tsx"',
    message:
      "Direct Stratis icon imports/exports remain. Use @/ui/icons as the single entrypoint.",
  },
];

let failed = false;

for (const check of checks) {
  try {
    execSync(check.command, { stdio: "pipe" });
    console.error(check.message);
    failed = true;
  } catch {
    // `rg` exits non-zero when there are no matches.
  }
}

if (failed) {
  process.exitCode = 1;
}
