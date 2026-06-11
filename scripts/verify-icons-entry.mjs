import { execSync } from "node:child_process";

const checks = [
  {
    command: "rg -n @flaticon/flaticon-uicons src",
    message: "Direct Flaticon imports remain in src.",
  },
  {
    command: "rg -n lucide-react src",
    message: "Direct lucide imports remain in src.",
  },
  {
    command: "rg -n @/ui/icons/stratis src scripts",
    message: "Local Stratis icon entry imports remain. Import directly from stratis-ui-icons.",
  },
  {
    command: "rg -n src/ui/icons/stratis src scripts",
    message: "Local Stratis icon path references remain. Import directly from stratis-ui-icons.",
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
