const { spawnSync } = require("node:child_process");
const path = require("node:path");

const expoCliPath = require.resolve("expo/bin/cli");
const args = [expoCliPath, "start", ...process.argv.slice(2)];
const result = spawnSync(process.execPath, args, {
  cwd: path.resolve(__dirname, ".."),
  env: {
    ...process.env,
    EXPO_NO_DOCTOR: "1",
  },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
