#!/usr/bin/env node
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const electronBinary = require("electron");
const args = process.argv.slice(2);
const env = { ...process.env };
const FORCE_OVERRIDE_KEYS = new Set([
  "GOOGLE_OAUTH_WEB_CLIENT_SECRET",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "DESKTOP_GOOGLE_OAUTH_CLIENT_SECRET",
  "VITE_DESKTOP_GOOGLE_OAUTH_CLIENT_ID",
  "VITE_DESKTOP_GOOGLE_OAUTH_SCOPE",
  "VITE_DESKTOP_GOOGLE_OAUTH_REDIRECT_URI",
]);

delete env.ELECTRON_RUN_AS_NODE;

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (!(key in env) || FORCE_OVERRIDE_KEYS.has(key)) {
      env[key] = value;
    }
  }
};

loadEnvFile(path.resolve(process.cwd(), ".env"));
loadEnvFile(path.resolve(process.cwd(), ".env.local"));

const child = spawn(electronBinary, args, {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
