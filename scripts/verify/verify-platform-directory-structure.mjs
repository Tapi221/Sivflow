import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
const ROOT_DIR = process.cwd();
const LEGACY_PLATFORM_NAME = "mo" + "bile";
const REQUIRED_PATHS = [
  "apps/web/index.html",
  "apps/desktop/package.json",
  "apps/android/package.json",
  "apps/android/app.json",
  "apps/android/index.ts",
  "apps/android/tsconfig.json",
  "apps/ios/README.md",
  "apps/ios/Sivflow/SivflowApplication.swift",
  "apps/ios/Sivflow/Features/Home/HomeScreen.swift",
  "packages/web-renderer/package.json",
  "packages/android-renderer/package.json",
  "packages/android-renderer/src/App.tsx",
  "packages/core/src",
  "packages/platform/src",
];
const FORBIDDEN_PATHS = [
  `apps/${LEGACY_PLATFORM_NAME}`,
  `packages/${LEGACY_PLATFORM_NAME}-renderer`,
  "apps/android/ios",
  "apps/android/src/integration/ioscalendar",
  "packages/android-renderer/src/screens/ipad",
];
const toAbsolutePath = (filePath) => path.join(ROOT_DIR, filePath);
const collectMissingRequiredPaths = () => REQUIRED_PATHS.filter((filePath) => !existsSync(toAbsolutePath(filePath)));
const collectRemainingForbiddenPaths = () => FORBIDDEN_PATHS.filter((filePath) => existsSync(toAbsolutePath(filePath)));
const printViolations = (label, values) => {
  if (values.length === 0) return;
  console.error(label);
  for (const value of values) console.error(`- ${value}`);
};
const main = () => {
  const missingRequiredPaths = collectMissingRequiredPaths();
  const remainingForbiddenPaths = collectRemainingForbiddenPaths();
  if (missingRequiredPaths.length === 0 && remainingForbiddenPaths.length === 0) {
    console.log("Platform directory structure check passed.");
    return;
  }
  printViolations("Missing required platform paths:", missingRequiredPaths);
  printViolations("Forbidden platform paths still exist:", remainingForbiddenPaths);
  process.exitCode = 1;
};
main();
