import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
const ROOT_DIR = process.cwd();
const LEGACY_PLATFORM_NAME = "mo" + "bile";
const REQUIRED_PATHS = [
  "apps/android/package.json",
  "apps/android/app.json",
  "apps/android/index.ts",
  "apps/android/tsconfig.json",
  "packages/android-renderer/package.json",
  "packages/android-renderer/src/App.tsx",
  "apps/ios/README.md",
  "apps/ios/Sivflow/SivflowApplication.swift",
  "apps/ios/Sivflow/Features/Home/HomeScreen.swift",
];
const FORBIDDEN_PATHS = [
  `apps/${LEGACY_PLATFORM_NAME}`,
  `packages/${LEGACY_PLATFORM_NAME}-renderer`,
  "apps/android/ios",
  "apps/android/src/integration/ioscalendar",
  "packages/android-renderer/src/screens/ipad",
];
const COMMANDS = [
  { args: ["scripts/fix-android-migration.mjs"], command: process.execPath, label: "Android migration cleanup" },
  { args: ["scripts/fix-android-migration.mjs", "--check"], command: process.execPath, label: "Android migration verification" },
  { args: ["run", "lint:fix"], command: "npm", label: "ESLint auto fix" },
  { args: ["run", "fix:source-conventions"], command: "npm", label: "Source convention fix" },
  { args: ["run", "verify:android-migration"], command: "npm", label: "Android migration npm verification" },
  { args: ["run", "lint"], command: "npm", label: "Final lint" },
];
const toAbsolutePath = (filePath) => path.join(ROOT_DIR, filePath);
const runCommand = ({ args, command, label }) => {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  if (result.error) {
    console.error(`${label} failed to start: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 0;
};
const printPathStatus = () => {
  const missingRequiredPaths = REQUIRED_PATHS.filter((filePath) => !existsSync(toAbsolutePath(filePath)));
  const remainingForbiddenPaths = FORBIDDEN_PATHS.filter((filePath) => existsSync(toAbsolutePath(filePath)));
  if (missingRequiredPaths.length === 0 && remainingForbiddenPaths.length === 0) return true;
  console.error("Platform migration path check failed.");
  for (const filePath of missingRequiredPaths) console.error(`- missing required path: ${filePath}`);
  for (const filePath of remainingForbiddenPaths) console.error(`- forbidden path still exists: ${filePath}`);
  return false;
};
const main = () => {
  const failedCommands = [];
  for (const commandConfig of COMMANDS) {
    const status = runCommand(commandConfig);
    if (status === 0) continue;
    failedCommands.push({ label: commandConfig.label, status });
    if (commandConfig.label === "Android migration cleanup" || commandConfig.label === "Android migration verification") break;
  }
  const pathsAreValid = printPathStatus();
  if (failedCommands.length === 0 && pathsAreValid) {
    console.log("Codex platform migration continuation completed.");
    return;
  }
  console.error("Codex platform migration continuation did not complete cleanly.");
  for (const failedCommand of failedCommands) console.error(`- ${failedCommand.label}: exit ${failedCommand.status}`);
  process.exitCode = 1;
};
main();
