import * as path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { build, context } from "esbuild";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const isWatch = process.argv.includes("--watch");

const buildOptions = {
  absWorkingDir: rootDir,
  entryPoints: ["electron/preload.ts"],
  outfile: "dist-electron/electron/preload.js",
  bundle: true,
  format: "cjs",
  platform: "node",
  target: ["node20"],
  external: ["electron"],
  sourcemap: true,
  logLevel: "info",
  legalComments: "none",
  tsconfig: "tsconfig.electron.json",
};

if (isWatch) {
  const ctx = await context(buildOptions);
  await ctx.watch();

  console.info("[electron] preload bundler watching...");

  const shutdown = async () => {
    await ctx.dispose();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });

  await new Promise(() => {});
} else {
  await build(buildOptions);
  console.info("[electron] preload bundle built");
}

