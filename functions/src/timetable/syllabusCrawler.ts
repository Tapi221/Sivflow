import crypto from "node:crypto";
import { lookup } from "node:dns/promises";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getAdminAuth, getDb, serverTimestamp } from "#src/firebaseAdmin.js";



type TimetableSyllabusSlot = {
  dayIndex: number;
  periodLabel: string;
};
type TimetableSyllabusCourseRecord = {
  id: string;
  sourceUrl: string;
  sourceId: string | null;
  institutionName: string;
  departmentName: string;
  facultyName: string;
  title: string;
  room: string;
  teacher: string;
  semesterLabel: string;
  credits: string;
  memo: string;
  syllabusUrl: string;
  slots: TimetableSyllabusSlot[];
  searchText: string;
  crawlerVersion: number;
  createdAt: unknown;
  updatedAt: unknown;
};
type CrawlSource = {
  sourceId: string | null;
  seedUrl: string;
  institutionName: string;
  facultyName: string;
  departmentName: string;
  maxPages: number;
};
type CrawlResult = {
  jobId: string;
  scannedPageCount: number;
  savedCourseCount: number;
  skippedUrlCount: number;
};
type RobotsRuleGroup = {
  applies: boolean;
  disallow: string[];
  allow: string[];
};



const REGION = "asia-northeast1";
const CRAWLER_VERSION = 1;
const DEFAULT_MAX_PAGES = 24;
const MAX_ALLOWED_PAGES = 80;
const MAX_LINKS_PER_PAGE = 80;
const MAX_HTML_LENGTH = 1_200_000;
const USER_AGENT = "SivflowSyllabusCrawler/1.0 (+https://sivflow.app)";
const COURSE_LINK_PATTERN = /syllabus|course|class|lesson|subject|detail|授業|講義|科目|シラバス/i;
const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const;
const PRIVATE_IPV4_PATTERNS = [/^10\./, /^127\./, /^169\.254\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[0-1])\./, /^0\./];
const upsertTimetableSyllabusSource = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request);
  await requireAdmin(uid);

  const db = await getDb();
  const now = await serverTimestamp();
  const seedUrl = getStringValue(request.data?.seedUrl);
  const sourceId = getStringValue(request.data?.sourceId) || createHashId(seedUrl);
  if (!seedUrl) throw new HttpsError("invalid-argument", "seedUrl is required.");

  await assertFetchableUrl(seedUrl);
  await db.doc(`timetableSyllabusSources/${sourceId}`).set({ seedUrl, institutionName: getStringValue(request.data?.institutionName), facultyName: getStringValue(request.data?.facultyName), departmentName: getStringValue(request.data?.departmentName), maxPages: clampMaxPages(request.data?.maxPages), enabled: request.data?.enabled !== false, updatedAt: now, createdAt: now }, { merge: true });
  return { ok: true, sourceId };
});
const crawlTimetableSyllabusUrl = onCall({ region: REGION, timeoutSeconds: 300, memory: "512MiB" }, async (request) => {
  const uid = requireUid(request);
  const source: CrawlSource = { sourceId: null, seedUrl: getStringValue(request.data?.seedUrl), institutionName: getStringValue(request.data?.institutionName), facultyName: getStringValue(request.data?.facultyName), departmentName: getStringValue(request.data?.departmentName), maxPages: clampMaxPages(request.data?.maxPages) };
  if (!source.seedUrl) throw new HttpsError("invalid-argument", "seedUrl is required.");
  return await crawlSyllabusSource(source, uid);
});
const runTimetableSyllabusCatalogCrawl = onSchedule({ schedule: "every 24 hours", timeZone: "Asia/Tokyo", region: REGION, timeoutSeconds: 540, memory: "1GiB" }, async () => {
  const db = await getDb();
  const snapshot = await db.collection("timetableSyllabusSources").where("enabled", "==", true).limit(20).get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    await crawlSyllabusSource({ sourceId: doc.id, seedUrl: getStringValue(data.seedUrl), institutionName: getStringValue(data.institutionName), facultyName: getStringValue(data.facultyName), departmentName: getStringValue(data.departmentName), maxPages: clampMaxPages(data.maxPages) }, null);
  }
});



const requireUid = (request: { auth?: { uid?: string; }; }) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Authentication required.");
  return uid;
};
const requireAdmin = async (uid: string): Promise<void> => {
  const user = await (await getAdminAuth()).getUser(uid);
  if (user.customClaims?.admin !== true) throw new HttpsError("permission-denied", "Admin access is required.");
};
const normalizeText = (value: string): string => value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, "\"").replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
const normalizeSearchText = (values: string[]): string => values.map((value) => normalizeText(value).toLowerCase()).filter(Boolean).join(" ");
const createHashId = (value: string): string => crypto.createHash("sha256").update(value).digest("hex").slice(0, 32);
const getStringValue = (value: unknown): string => typeof value === "string" ? value.trim() : "";
const getNumberValue = (value: unknown, fallback: number): number => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const clampMaxPages = (value: unknown): number => Math.max(1, Math.min(MAX_ALLOWED_PAGES, Math.floor(getNumberValue(value, DEFAULT_MAX_PAGES))));
const isPrivateIpv4 = (address: string): boolean => PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(address));
const isPrivateHostName = (hostname: string): boolean => {
  const normalizedHost = hostname.toLowerCase();
  return normalizedHost === "localhost" || normalizedHost.endsWith(".local") || normalizedHost.endsWith(".internal");
};
const isBlockedIpAddress = (address: string): boolean => {
  if (isPrivateIpv4(address)) return true;
  if (address === "::1" || address.startsWith("fe80:") || address.startsWith("fc") || address.startsWith("fd")) return true;
  return false;
};
const assertFetchableUrl = async (rawUrl: string): Promise<URL> => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new HttpsError("invalid-argument", "A valid URL is required.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") throw new HttpsError("invalid-argument", "Only http and https URLs are supported.");
  if (isPrivateHostName(url.hostname)) throw new HttpsError("invalid-argument", "Private hostnames cannot be crawled.");

  const addresses = await lookup(url.hostname, { all: true, verbatim: false });
  if (addresses.some((address) => isBlockedIpAddress(address.address))) throw new HttpsError("invalid-argument", "Private network URLs cannot be crawled.");

  url.hash = "";
  return url;
};
const fetchText = async (url: URL): Promise<{ text: string; contentType: string; }> => {
  const response = await fetch(url, { headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": USER_AGENT }, redirect: "follow", signal: AbortSignal.timeout(15_000) });
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) throw new HttpsError("unavailable", `Fetch failed with status ${response.status}.`);
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) throw new HttpsError("failed-precondition", "The URL did not return HTML.");
  return { text: (await response.text()).slice(0, MAX_HTML_LENGTH), contentType };
};
const parseRobotsGroups = (robotsText: string): RobotsRuleGroup[] => {
  const groups: RobotsRuleGroup[] = [];
  let currentAgents: string[] = [];
  let currentDisallow: string[] = [];
  let currentAllow: string[] = [];

  const flush = () => {
    if (currentAgents.length === 0) return;
    groups.push({ applies: currentAgents.some((agent) => agent === "*" || USER_AGENT.toLowerCase().startsWith(agent)), disallow: currentDisallow, allow: currentAllow });
    currentAgents = [];
    currentDisallow = [];
    currentAllow = [];
  };

  robotsText.split(/\r?\n/).forEach((line) => {
    const cleanLine = line.split("#")[0]?.trim() ?? "";
    const match = cleanLine.match(/^([^:]+):\s*(.*)$/);
    if (!match) return;

    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (key === "user-agent") {
      if (currentDisallow.length > 0 || currentAllow.length > 0) flush();
      currentAgents.push(value.toLowerCase());
      return;
    }
    if (key === "disallow") currentDisallow.push(value);
    if (key === "allow") currentAllow.push(value);
  });

  flush();
  return groups;
};
const isRobotsAllowed = async (url: URL): Promise<boolean> => {
  const robotsUrl = new URL("/robots.txt", url.origin);
  try {
    const response = await fetch(robotsUrl, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return true;
    const groups = parseRobotsGroups(await response.text());
    const applicableGroups = groups.filter((group) => group.applies);
    const path = `${url.pathname}${url.search}`;
    const allowedMatches = applicableGroups.flatMap((group) => group.allow).filter((rule) => rule && path.startsWith(rule));
    const disallowedMatches = applicableGroups.flatMap((group) => group.disallow).filter((rule) => rule && path.startsWith(rule));
    if (allowedMatches.length === 0 && disallowedMatches.length === 0) return true;
    return Math.max(0, ...allowedMatches.map((rule) => rule.length)) >= Math.max(0, ...disallowedMatches.map((rule) => rule.length));
  } catch {
    return false;
  }
};
const extractFirstMatch = (html: string, patterns: RegExp[]): string => {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return normalizeText(match[1]);
  }
  return "";
};
const extractTableValue = (html: string, labels: string[]): string => {
  const labelPattern = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return extractFirstMatch(html, [new RegExp(`<t[hd][^>]*>\\s*(?:${labelPattern})\\s*<\\/t[hd]>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`, "i"), new RegExp(`<dt[^>]*>\\s*(?:${labelPattern})\\s*<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>`, "i")]);
};
const extractTitle = (html: string): string => extractTableValue(html, ["科目名", "授業科目名", "講義名", "授業名"]) || extractFirstMatch(html, [/<h1[^>]*>([\s\S]*?)<\/h1>/i, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i, /<title[^>]*>([\s\S]*?)<\/title>/i]);
const extractSlots = (html: string): TimetableSyllabusSlot[] => {
  const text = normalizeText(html);
  const slots: TimetableSyllabusSlot[] = [];
  const pattern = /(月|火|水|木|金|土|日)(?:曜|曜日)?\s*(?:第)?([0-9０-９]+)\s*限/g;
  let match = pattern.exec(text);

  while (match) {
    const dayIndex = WEEKDAY_LABELS.indexOf(match[1] as typeof WEEKDAY_LABELS[number]);
    const periodLabel = match[2].replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
    if (dayIndex >= 0 && periodLabel) slots.push({ dayIndex, periodLabel });
    match = pattern.exec(text);
  }

  return slots.filter((slot, index) => slots.findIndex((candidate) => candidate.dayIndex === slot.dayIndex && candidate.periodLabel === slot.periodLabel) === index);
};
const parseCourse = (html: string, url: URL, source: CrawlSource): TimetableSyllabusCourseRecord | null => {
  const title = extractTitle(html);
  if (!title || title.length > 120) return null;

  const room = extractTableValue(html, ["教室", "教場", "場所"]);
  const teacher = extractTableValue(html, ["担当教員", "教員", "担当者", "担当"]);
  const semesterLabel = extractTableValue(html, ["開講学期", "学期", "開講時期", "年度"]);
  const credits = extractTableValue(html, ["単位", "単位数"]);
  const memo = extractTableValue(html, ["概要", "授業概要", "到達目標", "授業目的", "備考"]);
  const sourceUrl = url.toString();
  const id = createHashId(sourceUrl);
  const searchText = normalizeSearchText([source.institutionName, source.facultyName, source.departmentName, title, room, teacher, semesterLabel, credits, memo, sourceUrl]);

  return { id, sourceUrl, sourceId: source.sourceId, institutionName: source.institutionName, departmentName: source.departmentName, facultyName: source.facultyName, title, room, teacher, semesterLabel, credits, memo, syllabusUrl: sourceUrl, slots: extractSlots(html), searchText, crawlerVersion: CRAWLER_VERSION, createdAt: null, updatedAt: null };
};
const extractCandidateLinks = (html: string, baseUrl: URL): URL[] => {
  const links: URL[] = [];
  const pattern = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match = pattern.exec(html);

  while (match && links.length < MAX_LINKS_PER_PAGE) {
    const href = match[1];
    const label = normalizeText(match[2]);
    try {
      const url = new URL(href, baseUrl);
      url.hash = "";
      if (url.origin === baseUrl.origin && COURSE_LINK_PATTERN.test(`${label} ${url.pathname} ${url.search}`)) links.push(url);
    } catch {
      // Ignore malformed links.
    }
    match = pattern.exec(html);
  }

  return links.filter((link, index) => links.findIndex((candidate) => candidate.toString() === link.toString()) === index);
};
const saveCrawlResult = async (jobId: string, uid: string | null, source: CrawlSource, courses: TimetableSyllabusCourseRecord[], scannedPageCount: number, skippedUrlCount: number): Promise<CrawlResult> => {
  const db = await getDb();
  const now = await serverTimestamp();
  const jobRef = db.doc(`timetableSyllabusCrawlJobs/${jobId}`);
  const batch = db.batch();

  batch.set(jobRef, { uid, sourceId: source.sourceId, seedUrl: source.seedUrl, institutionName: source.institutionName, facultyName: source.facultyName, departmentName: source.departmentName, scannedPageCount, savedCourseCount: courses.length, skippedUrlCount, crawlerVersion: CRAWLER_VERSION, updatedAt: now, createdAt: now }, { merge: true });

  courses.forEach((course) => {
    const payload = { ...course, createdAt: now, updatedAt: now };
    batch.set(db.doc(`timetableSyllabusCatalog/${course.id}`), payload, { merge: true });
    batch.set(jobRef.collection("courses").doc(course.id), payload, { merge: true });
  });

  await batch.commit();
  return { jobId, scannedPageCount, savedCourseCount: courses.length, skippedUrlCount };
};
const crawlSyllabusSource = async (source: CrawlSource, uid: string | null): Promise<CrawlResult> => {
  const seedUrl = await assertFetchableUrl(source.seedUrl);
  const jobId = createHashId(`${source.sourceId ?? uid ?? "scheduled"}:${seedUrl.toString()}:${Date.now()}`);
  const queue: URL[] = [seedUrl];
  const seen = new Set<string>();
  const courses: TimetableSyllabusCourseRecord[] = [];
  let skippedUrlCount = 0;

  while (queue.length > 0 && seen.size < source.maxPages) {
    const url = queue.shift();
    if (!url) break;

    const key = url.toString();
    if (seen.has(key)) continue;
    seen.add(key);

    if (!(await isRobotsAllowed(url))) {
      skippedUrlCount += 1;
      continue;
    }

    try {
      const { text } = await fetchText(url);
      const course = parseCourse(text, url, source);
      if (course) courses.push(course);
      extractCandidateLinks(text, url).forEach((link) => {
        if (!seen.has(link.toString()) && queue.length + seen.size < source.maxPages) queue.push(link);
      });
    } catch {
      skippedUrlCount += 1;
    }
  }

  return await saveCrawlResult(jobId, uid, source, courses, seen.size, skippedUrlCount);
};



export { crawlTimetableSyllabusUrl, upsertTimetableSyllabusSource, runTimetableSyllabusCatalogCrawl };
