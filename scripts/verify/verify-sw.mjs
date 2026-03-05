import fs from "node:fs";
import path from "node:path";

const swPath = path.resolve(process.cwd(), "dist", "sw.js");

function fail(msg) {
  console.error(`[verify-sw] FAIL: ${msg}`);
  process.exit(1);
}

function findBalancedSlice(s, startIdx, openChar = "[", closeChar = "]") {
  let depth = 0;
  let inStr = null;
  let esc = false;

  for (let i = startIdx; i < s.length; i++) {
    const ch = s[i];

    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inStr = ch;
      continue;
    }
    if (ch === openChar) depth++;
    if (ch === closeChar) depth--;
    if (depth === 0) return s.slice(startIdx, i + 1);
  }

  return null;
}

function extractArrayAtCall(sw, callIdx) {
  const openIdx = sw.indexOf("[", callIdx);
  if (openIdx < 0) return null;
  return findBalancedSlice(sw, openIdx, "[", "]");
}

function extractPrecacheArray(sw) {
  const callKeys = ["precacheAndRoute(", "Pe("];
  for (const key of callKeys) {
    const idx = sw.indexOf(key);
    if (idx < 0) continue;
    const arr = extractArrayAtCall(sw, idx);
    if (arr && /["']?url["']?\s*:/.test(arr)) {
      return arr;
    }
  }

  const revisionAnchor = sw.indexOf('"revision"');
  if (revisionAnchor >= 0) {
    const openIdx = sw.lastIndexOf("[", revisionAnchor);
    if (openIdx >= 0) {
      const arr = findBalancedSlice(sw, openIdx, "[", "]");
      if (arr && /["']?url["']?\s*:/.test(arr)) {
        return arr;
      }
    }
  }

  return null;
}

function extractUrlsFromPrecacheArray(arrText) {
  const urls = [];
  const re = /["']?url["']?\s*:\s*(['"])(.*?)\1/g;
  let match;
  while ((match = re.exec(arrText)) !== null) {
    urls.push(match[2]);
  }
  return urls;
}

if (!fs.existsSync(swPath)) {
  fail(
    `Missing file: ${swPath}. Run "npm run build" first, or use "npm run build:verify-sw".`,
  );
}

const sw = fs.readFileSync(swPath, "utf8");

if (/createHandlerBoundToURL\(\s*['"`]\/?index\.html['"`]\s*\)/.test(sw)) {
  fail(
    "Service worker must not route navigation via createHandlerBoundToURL(index.html).",
  );
}

if (!sw.includes("SKIP_WAITING")) {
  fail("Service worker must keep SKIP_WAITING message handling.");
}

if (!sw.includes("clientsClaim") && !sw.includes("clients.claim")) {
  fail("Service worker must keep clientsClaim enabled.");
}

const hasCleanupOutdatedCaches =
  sw.includes("cleanupOutdatedCaches") ||
  (sw.includes("self.caches.keys()") &&
    sw.includes("self.registration.scope") &&
    sw.includes("-precache-"));
if (!hasCleanupOutdatedCaches) {
  fail("Service worker must keep cleanupOutdatedCaches enabled.");
}

const precacheArr = extractPrecacheArray(sw);
if (!precacheArr) {
  fail(
    "Failed to extract precacheAndRoute([...]) array. (generation shape changed?)",
  );
}

const urls = extractUrlsFromPrecacheArray(precacheArr);
if (urls.length === 0) {
  fail(
    "Extracted precache array, but found no url entries. (generation shape changed?)",
  );
}

const hasIndexHtml = urls.some((u) => /(^|\/)index\.html($|\?)/.test(u));
if (hasIndexHtml) {
  const hit = urls.filter((u) => /(^|\/)index\.html($|\?)/.test(u)).slice(0, 5);
  fail(`precache must not include index.html. hits=${JSON.stringify(hit)}`);
}

const hasOfflineHtml = urls.some((u) => /(^|\/)offline\.html($|\?)/.test(u));
if (!hasOfflineHtml) {
  fail("precache must include offline.html for offline navigation fallback.");
}

if (
  !sw.includes("setCatchHandler") &&
  !/matchPrecache\(\s*['"]\/offline\.html['"]\s*\)/.test(sw) &&
  !/['"]\/offline\.html['"]/.test(sw)
) {
  fail("Service worker must keep navigation catch handler for offline.html.");
}

if (!/mode\s*===\s*['"]navigate['"]/.test(sw)) {
  fail("Service worker must keep navigation runtime caching route.");
}

if (!/["']?statuses["']?\s*:\s*\[\s*200\s*\]/.test(sw)) {
  fail("NetworkFirst route must include cacheableResponse statuses:[200].");
}

if (!/["']?networkTimeoutSeconds["']?\s*:\s*3/.test(sw)) {
  fail("NetworkFirst route must keep networkTimeoutSeconds:3.");
}

console.log("[verify-sw] OK");
