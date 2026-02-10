#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const cwd = process.cwd();
const firebasercPath = path.join(cwd, ".firebaserc");
const functionsDir = path.join(cwd, "functions");

const ALLOW_SAME_PROJECT_ALIAS = process.env.ALLOW_SAME_PROJECT_ALIAS === "1";
const ALLOW_PROD_UNSAFE_CONVERTER_ENDPOINT =
  process.env.ALLOW_PROD_UNSAFE_CONVERTER_ENDPOINT === "1";

const fail = (message) => {
  console.error(`[predeploy-check] ${message}`);
  process.exit(1);
};

const info = (message) => {
  console.log(`[predeploy-check] ${message}`);
};

const parseDotEnvFile = (filePath) => {
  const values = new Map();
  if (!fs.existsSync(filePath)) return values;

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const key = match[1];
    let value = match[2] ?? "";
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values.set(key, value.trim());
  }
  return values;
};

const getArgValue = (flagNames) => {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    for (const flagName of flagNames) {
      if (arg === flagName) {
        return argv[i + 1] ?? null;
      }
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
    const projects = parsed.projects && typeof parsed.projects === "object" ? parsed.projects : {};
    return projects;
  } catch (error) {
    fail(`Failed to parse .firebaserc: ${String(error)}`);
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
const activeAlias = resolveAliasFromValue(activeProjectRaw) ?? resolveAliasFromValue(activeProjectId);

if (!activeProjectId) {
  fail("Cannot resolve active Firebase project. Use --project or firebase use.");
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
    "staging and prod aliases resolve to the same project. Set ALLOW_SAME_PROJECT_ALIAS=1 only for emergency."
  );
}

const isProdDeploy =
  (prodProjectId && activeProjectId === prodProjectId) ||
  (!prodProjectId && activeAlias === "prod");

const envCandidates = [];
if (activeProjectId) {
  envCandidates.push(path.join(functionsDir, `.env.${activeProjectId}`));
}
if (activeAlias && activeAlias !== activeProjectId) {
  envCandidates.push(path.join(functionsDir, `.env.${activeAlias}`));
}
envCandidates.push(path.join(functionsDir, ".env"));

const findConverterEndpoint = () => {
  for (const candidate of envCandidates) {
    const envMap = parseDotEnvFile(candidate);
    const endpoint = envMap.get("PPTX_CONVERTER_ENDPOINT") ?? envMap.get("PPTX_CONVERSION_ENDPOINT");
    if (endpoint) {
      return { endpoint, filePath: candidate };
    }
  }
  return null;
};

const endpointSource = findConverterEndpoint();
const endpoint = endpointSource?.endpoint ?? "";

if (isProdDeploy) {
  if (!endpoint) {
    fail("PPTX_CONVERTER_ENDPOINT is missing for prod deploy.");
  }

  const normalized = endpoint.trim().toLowerCase();
  const isLocal =
    normalized.includes("localhost") ||
    normalized.includes("127.0.0.1") ||
    normalized.includes("0.0.0.0");
  const isPlaceholderCloudFunction =
    normalized.includes("cloudfunctions.net") && normalized.includes("pptxconverterendpoint");

  if ((isLocal || isPlaceholderCloudFunction) && !ALLOW_PROD_UNSAFE_CONVERTER_ENDPOINT) {
    const reasons = [];
    if (isLocal) reasons.push("local endpoint");
    if (isPlaceholderCloudFunction) reasons.push("placeholder cloudfunctions endpoint");
    fail(
      `Unsafe prod PPTX_CONVERTER_ENDPOINT (${reasons.join(", ")}): ${endpoint}. Set ALLOW_PROD_UNSAFE_CONVERTER_ENDPOINT=1 only for emergency.`
    );
  }
}

info(`Active project: ${activeProjectId}${activeAlias ? ` (alias: ${activeAlias})` : ""}`);
if (endpointSource) {
  info(`PPTX_CONVERTER_ENDPOINT loaded from ${path.relative(cwd, endpointSource.filePath)}`);
} else {
  info("PPTX_CONVERTER_ENDPOINT is not configured in functions/.env*");
}
info("predeploy-check passed.");
