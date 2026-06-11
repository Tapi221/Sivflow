const CODE_BLOCK_RECENT_LANGUAGE_STORAGE_KEY = "codeblock_recent_langs";
const CODE_BLOCK_MAX_RECENT_LANGUAGES = 3;
const CODE_BLOCK_SUPPORTED_LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "sql", label: "SQL" },
  { value: "markup", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash" },
  { value: "markdown", label: "Markdown" },
] as const;
const CODE_BLOCK_SUPPORTED_LANGUAGE_VALUES = new Set<string>(CODE_BLOCK_SUPPORTED_LANGUAGES.map(({ value }) => value));



export { CODE_BLOCK_MAX_RECENT_LANGUAGES, CODE_BLOCK_RECENT_LANGUAGE_STORAGE_KEY, CODE_BLOCK_SUPPORTED_LANGUAGE_VALUES, CODE_BLOCK_SUPPORTED_LANGUAGES };
