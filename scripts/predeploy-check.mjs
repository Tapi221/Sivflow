import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ALLOW_SAME_PROJECT_ALIAS = process.env.ALLOW_SAME_PROJECT_ALIAS === "1";
const ALLOW_PLACEHOLDER_IN_PROD = process.env.ALLOW_PLACEHOLDER_IN_PROD === "1";
const ALLOW_CLOUDFUNCTIONS_PPTX_ENDPOINT_IN_PROD =
  process.env.ALLOW_CLOUDFUNCTIONS_PPTX_ENDPOINT_IN_PROD === "1";
const ALLOW_EMPTY_PPTX_CONVERTER_ENDPOINT_IN_PROD =
  process.env.ALLOW_EMPTY_PPTX_CONVERTER_ENDPOINT_IN_PROD === "1";

const fail = (message) => {
  console.error(`[predeploy-check] ${message}`);
  process.exit(1);
};

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Failed to parse ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const readEnvFile = (filePath) => {
  const map = {};
  if (!fs.existsSync(filePath)) return map;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalIndex = line.indexOf("=");
    if (equalIndex <= 0) continue;
    const key = line.slice(0, equalIndex).trim();
    const value = line.slice(equalIndex + 1).trim();
    if (!key) continue;
    map[key] = value;
  }
  return map;
};

const rootDir = process.cwd();
const rcPath = path.join(rootDir, ".firebaserc");
const firebaseJsonPath = path.join(rootDir, "firebase.json");

if (!fs.existsSync(rcPath)) {
  fail(".firebaserc not found");
}

const rc = readJson(rcPath);
const projects = rc.projects ?? {};
const stagingProjectId = projects.staging;
const prodProjectId = projects.prod;

const resolveAliasToProjectId = (value) => {
  if (!value) return value;
  return projects[value] ?? value;
};

if (
  stagingProjectId &&
  prodProjectId &&
  stagingProjectId === prodProjectId &&
  !ALLOW_SAME_PROJECT_ALIAS
) {
  fail(
    `projects.staging and projects.prod both point to "${prodProjectId}". ` +
      "Set ALLOW_SAME_PROJECT_ALIAS=1 only for explicit emergency override."
  );
}

const resolveActiveProjectId = () => {
  const fromEnvRaw =
    process.env.GCLOUD_PROJECT ||
    process.env.PROJECT_ID ||
    process.env.FIREBASE_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_DEPLOY_PROJECT;
  if (fromEnvRaw) return resolveAliasToProjectId(fromEnvRaw);

  try {
    const raw = execSync("firebase use --json", {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const parsed = JSON.parse(raw);
    return resolveAliasToProjectId(parsed?.result ?? null);
  } catch {
    return null;
  }
};

const activeProjectId = resolveActiveProjectId();
if (!activeProjectId) {
  fail("Unable to determine active Firebase project id.");
}

const firebaseConfig = readJson(firebaseJsonPath);
const functionsConfigRaw = firebaseConfig.functions;
const functionsConfig = Array.isArray(functionsConfigRaw)
  ? functionsConfigRaw[0]
  : functionsConfigRaw ?? {};
const functionsSourceDir = path.join(rootDir, functionsConfig.source ?? "functions");

const envBasePath = path.join(functionsSourceDir, ".env");
const envProjectPath = path.join(functionsSourceDir, `.env.${activeProjectId}`);
const envConfig = {
  ...readEnvFile(envBasePath),
  ...readEnvFile(envProjectPath),
};

const isProdProject = !!prodProjectId && activeProjectId === prodProjectId;
const endpoint = envConfig.PPTX_CONVERTER_ENDPOINT ?? "";
const implementation = (envConfig.PPTX_CONVERTER_IMPLEMENTATION ?? "").trim().toLowerCase();

if (isProdProject && !endpoint && !ALLOW_EMPTY_PPTX_CONVERTER_ENDPOINT_IN_PROD) {
  fail(
    `PPTX_CONVERTER_ENDPOINT must be configured for prod project "${activeProjectId}". ` +
      "Set ALLOW_EMPTY_PPTX_CONVERTER_ENDPOINT_IN_PROD=1 only for explicit emergency override."
  );
}

if (endpoint && !/^https?:\/\//i.test(endpoint)) {
  fail(`PPTX_CONVERTER_ENDPOINT must start with http/https: ${endpoint}`);
}

if (isProdProject && /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?([/]|$)/i.test(endpoint)) {
  fail(`Invalid PPTX_CONVERTER_ENDPOINT for prod project "${activeProjectId}": ${endpoint}`);
}

if (
  isProdProject &&
  /https?:\/\/[^/]*cloudfunctions\.net\/pptxConverterEndpoint(?:[/?#]|$)/i.test(endpoint) &&
  !ALLOW_CLOUDFUNCTIONS_PPTX_ENDPOINT_IN_PROD
) {
  fail(
    `PPTX_CONVERTER_ENDPOINT points to placeholder cloud function in prod project "${activeProjectId}": ${endpoint}`
  );
}

if (isProdProject && implementation === "placeholder" && !ALLOW_PLACEHOLDER_IN_PROD) {
  fail(
    `PPTX_CONVERTER_IMPLEMENTATION=placeholder is blocked for prod project "${activeProjectId}". ` +
      "Set ALLOW_PLACEHOLDER_IN_PROD=1 only for explicit emergency override."
  );
}

console.log(
  `[predeploy-check] OK project=${activeProjectId} endpoint=${endpoint || "(unset)"} implementation=${
    implementation || "(unset)"
  }`
);
