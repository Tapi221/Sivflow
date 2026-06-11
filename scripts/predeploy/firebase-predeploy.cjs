const { spawnSync } = require("node:child_process");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const FUNCTIONS_DIR = path.join(ROOT_DIR, "functions");
const IS_WINDOWS = process.platform === "win32";
const NPM_COMMAND = IS_WINDOWS ? "npm.cmd" : "npm";
const PREDEPLOY_STEPS = [
  ["--prefix", FUNCTIONS_DIR, "ci"],
  ["--prefix", FUNCTIONS_DIR, "run", "build"],
  ["--prefix", FUNCTIONS_DIR, "run", "manifest"],
];

const formatCommand = (args) => `${NPM_COMMAND} ${args.join(" ")}`;

const runNpm = (args) => {
  console.log(`[firebase-predeploy] 実行: ${formatCommand(args)}`);

  const result = IS_WINDOWS
    ? spawnSync("cmd.exe", ["/c", NPM_COMMAND, ...args], { env: process.env, shell: false, stdio: "inherit" })
    : spawnSync(NPM_COMMAND, args, { env: process.env, shell: false, stdio: "inherit" });

  if (result.error) {
    console.error("[firebase-predeploy] npm コマンドの起動に失敗しました:", result.error);
    process.exit(1);
  }

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
};

for (const step of PREDEPLOY_STEPS) {
  runNpm(step);
}
