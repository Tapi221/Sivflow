import crypto from "node:crypto";
import { lookup } from "node:dns/promises";
import { HttpsError } from "firebase-functions/v2/https";
import { getPostgresPool } from "#src/postgres.js";

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

const CRAWLER_VERSION = 1;
const DEFAULT_MAX_PAGES = 24;
const MAX_ALLOWED_PAGES = 80;
const MAX_LINKS_PER_PAGE = 80;
const MAX_HTML_LENGTH = 1_200_000;
const USER_AGENT = "SivflowSyllabusCrawler/1.0 (+https://sivflow.app)";
const COURSE_LINK_PATTERN = /syllabus|course|class|lesson|subject|detail|授業|講義|科目|シラバス/i;
const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const;
const PRIVATE_IPV4_PATTERNS = [/^10\./, /^127\./, /^169\.254\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[0-1])\./, /^0\./];

const normalizeText = (value: string): string =>
  value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
const normalizeSearchText = (values: string[]): string => values.map((value) => normalizeText(value).toLowerCase()).filter(Boolean).join(" ");
const createHashId = (value: string): string => crypto.createHash("sha256").update(value).digest("hex").slice(0, 32);
const getStringValue = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const getNumberValue = (value: unknown, fallback: number): number => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
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
const fetchText = async (url: URL): Promise<{ text: string; contentType: string }> => {
  const response = await fetch(url, {
    headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
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
  return extractFirstMatch(html, [
    new RegExp(`<t[hd][^>]*>\\s*(?:${labelPattern})\\s*<\\/t[hd]>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`, "i"),
    new RegExp(`<dt[^>]*>\\s*(?:${labelPattern})\\s*<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>`, "i"),
  ]);
};
const extractTitle = (html: string): string =>
  extractTableValue(html, ["科目名", "授業科目名", "講義名", "授業名"]) ||
  extractFirstMatch(html, [/<h1[^>]*>([\s\S]*?)<\/h1>/i, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i, /<title[^>]*>([\s\S]*?)<\/title>/i]);
const extractSlots = (html: string): TimetableSyllabusSlot[] => {
  const text = normalizeText(html);
  const slots: TimetableSyllabusSlot[] = [];
  const pattern = /(月|火|水|木|金|土|日)(?:曜|曜日)?\s*(?:第)?([0-9０-９]+)\s*限/g;
  let match = pattern.exec(text);

  while (match) {
    const dayIndex = WEEKDAY_LABELS.indexOf(match[1] as (typeof WEEKDAY_LABELS)[number]);
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

  return {
    id,
    sourceUrl,
    sourceId: source.sourceId,
    institutionName: source.institutionName,
    departmentName: source.departmentName,
    facultyName: source.facultyName,
    title,
    room,
    teacher,
    semesterLabel,
    credits,
    memo,
    syllabusUrl: sourceUrl,
    slots: extractSlots(html),
    searchText,
    crawlerVersion: CRAWLER_VERSION,
    createdAt: null,
    updatedAt: null,
  };
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
      // 不正なリンクは無視する。
    }
    match = pattern.exec(html);
  }

  return links.filter((link, index) => links.findIndex((candidate) => candidate.toString() === link.toString()) === index);
};
const upsertTimetableSyllabusSourceRecord = async (input: Record<string, unknown>) => {
  const seedUrl = getStringValue(input.seedUrl);
  if (!seedUrl) throw new HttpsError("invalid-argument", "seedUrl is required.");

  await assertFetchableUrl(seedUrl);
  const sourceId = getStringValue(input.sourceId) || createHashId(seedUrl);
  await getPostgresPool().query(
    `insert into timetable_syllabus_sources (
        source_id,
        seed_url,
        institution_name,
        faculty_name,
        department_name,
        max_pages,
        enabled,
        created_at,
        updated_at
      ) values ($1, $2, $3, $4, $5, $6, $7, now(), now())
      on conflict (source_id) do update set
        seed_url = excluded.seed_url,
        institution_name = excluded.institution_name,
        faculty_name = excluded.faculty_name,
        department_name = excluded.department_name,
        max_pages = excluded.max_pages,
        enabled = excluded.enabled,
        updated_at = now()`,
    [
      sourceId,
      seedUrl,
      getStringValue(input.institutionName),
      getStringValue(input.facultyName),
      getStringValue(input.departmentName),
      clampMaxPages(input.maxPages),
      input.enabled !== false,
    ],
  );
  return { ok: true, sourceId };
};
const createCrawlSourceFromInput = (input: Record<string, unknown>): CrawlSource => ({
  sourceId: null,
  seedUrl: getStringValue(input.seedUrl),
  institutionName: getStringValue(input.institutionName),
  facultyName: getStringValue(input.facultyName),
  departmentName: getStringValue(input.departmentName),
  maxPages: clampMaxPages(input.maxPages),
});
const saveCrawlResult = async (
  jobId: string,
  uid: string | null,
  source: CrawlSource,
  courses: TimetableSyllabusCourseRecord[],
  scannedPageCount: number,
  skippedUrlCount: number,
): Promise<CrawlResult> => {
  const client = await getPostgresPool().connect();
  const savedAt = new Date().toISOString();

  try {
    await client.query("begin");
    await client.query(
      `insert into timetable_syllabus_crawl_jobs (
          job_id,
          uid,
          source_id,
          seed_url,
          institution_name,
          faculty_name,
          department_name,
          scanned_page_count,
          saved_course_count,
          skipped_url_count,
          crawler_version,
          created_at,
          updated_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), now())
        on conflict (job_id) do update set
          uid = excluded.uid,
          source_id = excluded.source_id,
          seed_url = excluded.seed_url,
          institution_name = excluded.institution_name,
          faculty_name = excluded.faculty_name,
          department_name = excluded.department_name,
          scanned_page_count = excluded.scanned_page_count,
          saved_course_count = excluded.saved_course_count,
          skipped_url_count = excluded.skipped_url_count,
          crawler_version = excluded.crawler_version,
          updated_at = now()`,
      [
        jobId,
        uid,
        source.sourceId,
        source.seedUrl,
        source.institutionName,
        source.facultyName,
        source.departmentName,
        scannedPageCount,
        courses.length,
        skippedUrlCount,
        CRAWLER_VERSION,
      ],
    );

    for (const course of courses) {
      const coursePayload = { ...course, createdAt: savedAt, updatedAt: savedAt };
      await client.query(
        `insert into timetable_syllabus_catalog (
            id,
            source_url,
            source_id,
            institution_name,
            department_name,
            faculty_name,
            title,
            room,
            teacher,
            semester_label,
            credits,
            memo,
            syllabus_url,
            slots,
            search_text,
            crawler_version,
            created_at,
            updated_at
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16, now(), now())
          on conflict (id) do update set
            source_url = excluded.source_url,
            source_id = excluded.source_id,
            institution_name = excluded.institution_name,
            department_name = excluded.department_name,
            faculty_name = excluded.faculty_name,
            title = excluded.title,
            room = excluded.room,
            teacher = excluded.teacher,
            semester_label = excluded.semester_label,
            credits = excluded.credits,
            memo = excluded.memo,
            syllabus_url = excluded.syllabus_url,
            slots = excluded.slots,
            search_text = excluded.search_text,
            crawler_version = excluded.crawler_version,
            updated_at = now()`,
        [
          course.id,
          course.sourceUrl,
          course.sourceId,
          course.institutionName,
          course.departmentName,
          course.facultyName,
          course.title,
          course.room,
          course.teacher,
          course.semesterLabel,
          course.credits,
          course.memo,
          course.syllabusUrl,
          JSON.stringify(course.slots),
          course.searchText,
          course.crawlerVersion,
        ],
      );
      await client.query(
        `insert into timetable_syllabus_crawl_job_courses (
            job_id,
            course_id,
            course_payload,
            created_at,
            updated_at
          ) values ($1, $2, $3::jsonb, now(), now())
          on conflict (job_id, course_id) do update set
            course_payload = excluded.course_payload,
            updated_at = now()`,
        [jobId, course.id, JSON.stringify(coursePayload)],
      );
    }

    await client.query("commit");
    return { jobId, scannedPageCount, savedCourseCount: courses.length, skippedUrlCount };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
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
const crawlTimetableSyllabusUrlForUser = async (input: Record<string, unknown>, uid: string): Promise<CrawlResult> => {
  const source = createCrawlSourceFromInput(input);
  if (!source.seedUrl) throw new HttpsError("invalid-argument", "seedUrl is required.");
  return await crawlSyllabusSource(source, uid);
};
const runTimetableSyllabusCatalogCrawlJob = async (): Promise<{ ok: true; jobs: CrawlResult[] }> => {
  const result = await getPostgresPool().query(
    `select source_id, seed_url, institution_name, faculty_name, department_name, max_pages
       from timetable_syllabus_sources
      where enabled = true
      order by updated_at desc
      limit 20`,
  );
  const jobs: CrawlResult[] = [];

  for (const row of result.rows) {
    jobs.push(
      await crawlSyllabusSource(
        {
          sourceId: getStringValue(row.source_id),
          seedUrl: getStringValue(row.seed_url),
          institutionName: getStringValue(row.institution_name),
          facultyName: getStringValue(row.faculty_name),
          departmentName: getStringValue(row.department_name),
          maxPages: clampMaxPages(row.max_pages),
        },
        null,
      ),
    );
  }

  return { ok: true, jobs };
};

export { crawlTimetableSyllabusUrlForUser, runTimetableSyllabusCatalogCrawlJob, upsertTimetableSyllabusSourceRecord };
