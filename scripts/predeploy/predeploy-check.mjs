#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const cwd = process.cwd();
const firebasercPath = path.join(cwd, ".firebaserc");
const productionEnvPath = path.join(cwd, ".env.production");

const ALLOW_SAME_PROJECT_ALIAS = process.env.ALLOW_SAME_PROJECT_ALIAS === "1";

const fail = (message) => {
  console.error(`[predeploy-check] ${message}`);
  process.exit(1);
};

const info = (message) => {
  console.log(`[predeploy-check] ${message}`);
};

const getArgValue = (flagNames) => {
  const argv = process.argv.slice(2);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    for (const flagName of flagNames) {
      if (arg === flagName) return argv[index + 1] ?? null;
      if (arg.startsWith(`${flagName}=`)) {
        return arg.slice(flagName.length + 1);
      }
    }
  }
  return null;
};

const loadFirebaseRc = () => {
  if (!fs.existsSync(firebasercPath)) {
    fail(".firebaserc not found.");
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(firebasercPath, "utf8"));
    return parsed.projects && typeof parsed.projects === "object"
      ? parsed.projects
      : {};
  } catch (error) {
    fail(`Failed to parse .firebaserc: ${String(error)}`);
  }
};

const loadDotEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return {};

  const values = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    values[key] = rawValue.replace(/^["']|["']$/g, "");
  }

  return values;
};

const requireEnvValue = (key, fileValues) => {
  const value = process.env[key] ?? fileValues[key];

  if (!value || value === "__REPLACE_ME__" || value.startsWith("__REPLACE_")) {
    fail(
      `${key} is required for production Google Calendar OAuth. Set it in the deploy environment or .env.production.`,
    );
  }
};

const projects = loadFirebaseRc();

const resolveProjectId = (value) => {
  if (!value) return null;
  return projects[value] ?? value;
};

const resolveAliasFromValue = (value) => {
  if (!value) return null;
  if (Object.prototype.hasOwnProperty.call(projects, value)) return value;
  for (const [alias, projectId] of Object.entries(projects)) {
    if (projectId === value) return alias;
  }
  return null;
};

const resolveActiveProjectRaw = () => {
  const fromArgs = getArgValue(["--project", "-P"]);
  if (fromArgs) return fromArgs;

  const fromEnv =
    process.env.FIREBASE_DEPLOY_PROJECT ??
    process.env.FIREBASE_PROJECT ??
    process.env.GCLOUD_PROJECT ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    null;
  if (fromEnv) return fromEnv;

  try {
    const output = execFileSync("firebase", ["use", "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const parsed = JSON.parse(output);
    if (parsed?.status === "success" && typeof parsed?.result === "string") {
      return parsed.result;
    }
  } catch (error) {
    info(`firebase use --json failed: ${String(error)}`);
  }

  return null;
};

const activeProjectRaw = resolveActiveProjectRaw();
const activeProjectId = resolveProjectId(activeProjectRaw);
const activeAlias =
  resolveAliasFromValue(activeProjectRaw) ??
  resolveAliasFromValue(activeProjectId);

if (!activeProjectId) {
  fail(
    "Cannot resolve active Firebase project. Use --project or firebase use.",
  );
}

const stagingProjectId = resolveProjectId("staging");
const prodProjectId = resolveProjectId("prod");

if (
  stagingProjectId &&
  prodProjectId &&
  stagingProjectId === prodProjectId &&
  !ALLOW_SAME_PROJECT_ALIAS
) {
  fail(
    "staging and prod aliases resolve to the same project. Set ALLOW_SAME_PROJECT_ALIAS=1 only for emergency.",
  );
}

info(
  `Active project: ${activeProjectId}${activeAlias ? ` (alias: ${activeAlias})` : ""}`,
);

if (activeAlias === "prod" || activeProjectId === prodProjectId) {
  const productionEnv = loadDotEnvFile(productionEnvPath);
  requireEnvValue("VITE_GOOGLE_OAUTH_CLIENT_ID", productionEnv);
  requireEnvValue("VITE_GOOGLE_OAUTH_SERVER_TOKENS", productionEnv);
}

info("predeploy-check passed.");
