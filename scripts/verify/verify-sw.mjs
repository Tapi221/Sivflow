import fs from "node:fs";
import path from "node:path";

const swPath = path.resolve(process.cwd(), "dist", "sw.js");

const fail = (msg) => {
  console.error(`[verify-sw] 失敗: ${msg}`);
  process.exit(1);
};

const findBalancedSlice = (s, startIdx, openChar = "[", closeChar = "]") => {
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
};

const extractArrayAtCall = (sw, callIdx) => {
  const openIdx = sw.indexOf("[", callIdx);
  if (openIdx < 0) return null;
  return findBalancedSlice(sw, openIdx, "[", "]");
};

const extractPrecacheArray = (sw) => {
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
};

const extractUrlsFromPrecacheArray = (arrText) => {
  const urls = [];
  const re = /["']?url["']?\s*:\s*(['"])(.*?)\1/g;
  let match;
  while ((match = re.exec(arrText)) !== null) {
    urls.push(match[2]);
  }
  return urls;
};

if (!fs.existsSync(swPath)) {
  fail(
    `file が見つかりません: ${swPath}。先に "npm run build" を実行するか、"npm run build:verify-sw" を使ってください。`,
  );
}

const sw = fs.readFileSync(swPath, "utf8");

if (/createHandlerBoundToURL\(\s*['"`]\/?index\.html['"`]\s*\)/.test(sw)) {
  fail(
    "Service worker は createHandlerBoundToURL(index.html) で navigation を route してはいけません。",
  );
}

if (!sw.includes("SKIP_WAITING")) {
  fail("Service worker は SKIP_WAITING message handling を維持する必要があります。");
}

if (!sw.includes("clientsClaim") && !sw.includes("clients.claim")) {
  fail("Service worker は clientsClaim を有効なまま維持する必要があります。");
}

const hasCleanupOutdatedCaches =
  sw.includes("cleanupOutdatedCaches") ||
  (sw.includes("self.caches.keys()") &&
    sw.includes("self.registration.scope") &&
    sw.includes("-precache-"));
if (!hasCleanupOutdatedCaches) {
  fail("Service worker は cleanupOutdatedCaches を有効なまま維持する必要があります。");
}

const precacheArr = extractPrecacheArray(sw);
if (!precacheArr) {
  fail(
    "precacheAndRoute([...]) array の抽出に失敗しました。（生成形式が変わった可能性があります）",
  );
}

const urls = extractUrlsFromPrecacheArray(precacheArr);
if (urls.length === 0) {
  fail(
    "precache array は抽出できましたが、url entry が見つかりませんでした。（生成形式が変わった可能性があります）",
  );
}

const hasIndexHtml = urls.some((u) => /(^|\/)index\.html($|\?)/.test(u));
if (hasIndexHtml) {
  const hit = urls.filter((u) => /(^|\/)index\.html($|\?)/.test(u)).slice(0, 5);
  fail(`precache に index.html を含めてはいけません。hits=${JSON.stringify(hit)}`);
}

const hasOfflineHtml = urls.some((u) => /(^|\/)offline\.html($|\?)/.test(u));
if (!hasOfflineHtml) {
  fail("precache には offline navigation fallback 用の offline.html を含める必要があります。");
}

if (
  !sw.includes("setCatchHandler") &&
  !/matchPrecache\(\s*['"]\/offline\.html['"]\s*\)/.test(sw) &&
  !/['"]\/offline\.html['"]/.test(sw)
) {
  fail("Service worker は offline.html 用の navigation catch handler を維持する必要があります。");
}

if (!/mode\s*===\s*['"]navigate['"]/.test(sw)) {
  fail("Service worker は navigation runtime caching route を維持する必要があります。");
}

if (!/["']?statuses["']?\s*:\s*\[\s*200\s*\]/.test(sw)) {
  fail("NetworkFirst route には cacheableResponse statuses:[200] が必要です。");
}

if (!/["']?networkTimeoutSeconds["']?\s*:\s*3/.test(sw)) {
  fail("NetworkFirst route は networkTimeoutSeconds:3 を維持する必要があります。");
}

console.log("[verify-sw] OK: Service Worker 検証が完了しました");
