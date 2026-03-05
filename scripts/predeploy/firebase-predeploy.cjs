const { spawnSync } = require("node:child_process");
const path = require("node:path");

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

// Firebase CLI sets RESOURCE_DIR for functions predeploy hooks
const resourceDir = process.env.RESOURCE_DIR
  ? path.resolve(process.env.RESOURCE_DIR)
  : path.resolve("functions");

function run(args) {
  console.log("[predeploy] running:", npmCmd, args.join(" "));
  let r;
  if (isWin) {
    // On Windows, run cmd.exe /c npm.cmd ... to avoid EINVAL/ENOENT for .cmd wrappers
    r = spawnSync("cmd.exe", ["/c", npmCmd, ...args], {
      stdio: "inherit",
      shell: false,
      env: process.env,
    });
  } else {
    r = spawnSync(npmCmd, args, {
      stdio: "inherit",
      shell: false,
      env: process.env,
    });
  }
  if (r.error) {
    console.error("[predeploy] spawn error:", r.error);
    process.exit(1);
  }
  if (typeof r.status === "number" && r.status !== 0) {
    process.exit(r.status);
  }
}

console.log("[predeploy] using:", npmCmd);
console.log("[predeploy] resourceDir:", resourceDir);
// Only run scripts if they are defined in resourceDir/package.json
const pkgPath = path.join(resourceDir, "package.json");
let pkg = null;
try {
  pkg = require(pkgPath);
} catch (e) {
  console.log(
    "[predeploy] no package.json in",
    resourceDir,
    "- skipping lint/build",
  );
}

if (pkg && pkg.scripts && pkg.scripts.lint) {
  run(["--prefix", resourceDir, "run", "lint"]);
} else {
  console.log("[predeploy] skipping lint (script not defined)");
}

if (pkg && pkg.scripts && pkg.scripts.build) {
  run(["--prefix", resourceDir, "run", "build"]);
} else {
  console.log("[predeploy] skipping build (script not defined)");
}
