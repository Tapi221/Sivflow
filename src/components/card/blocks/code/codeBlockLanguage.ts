const VIEWER_SUPPORTED_LANGS = new Set([
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "json",
  "bash",
  "css",
  "html",
  "markdown",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "go",
  "rust",
  "sql",
  "yaml",
  "clike",
]);
const VIEWER_LANGUAGE_ALIASES: Record<string, string> = {
  "c++": "cpp",
  cplusplus: "cpp",
  cc: "cpp",
  "c#": "csharp",
  cs: "csharp",
  shell: "bash",
  sh: "bash",
  text: "clike",
  txt: "clike",
  plain: "clike",
};
const VIEWER_LANGUAGE_FULL_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  jsx: "JSX",
  tsx: "TSX",
  json: "JSON",
  bash: "Shell",
  css: "CSS",
  html: "HTML",
  markdown: "Markdown",
  python: "Python",
  java: "Java",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  go: "Go",
  rust: "Rust",
  sql: "SQL",
  yaml: "YAML",
  clike: "Plain text",
};
const VIEWER_LANGUAGE_SHORT_LABELS: Record<string, string> = {
  javascript: "JS",
  typescript: "TS",
  jsx: "JSX",
  tsx: "TSX",
  json: "JSON",
  bash: "SH",
  css: "CSS",
  html: "HTML",
  markdown: "MD",
  python: "PY",
  java: "JAVA",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  go: "GO",
  rust: "RS",
  sql: "SQL",
  yaml: "YML",
  clike: "TXT",
};



const normalizeViewerLanguage = (input?: string) => {
  const raw = (input || "").toLowerCase().trim();
  const normalized = VIEWER_LANGUAGE_ALIASES[raw] ?? raw;
  return VIEWER_SUPPORTED_LANGS.has(normalized) ? normalized : "clike";
};
const getViewerLanguageLabels = (language: string) => {
  return { full: VIEWER_LANGUAGE_FULL_LABELS[language] ?? language, short: VIEWER_LANGUAGE_SHORT_LABELS[language] ?? language.toUpperCase() };
};
const normalizeEditorLanguage = (input?: string) => {
  const lang = (input || "").toLowerCase().trim();
  if (lang === "html") return "markup";
  return lang ?? "javascript";
};



export { normalizeViewerLanguage, getViewerLanguageLabels, normalizeEditorLanguage };
