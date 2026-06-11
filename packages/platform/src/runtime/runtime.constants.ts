const RUNTIME_KINDS = {
  web: "web",
  desktop: "desktop",
  ios: "ios",
  android: "android",
} as const;



type RuntimeKind = (typeof RUNTIME_KINDS)[keyof typeof RUNTIME_KINDS];



const RUNTIME_RELOAD_KEYS = {
  chunk: "__hard_reload_once__",
  vitePreload: "__vite_preload_reload__",
  swController: "__sw_controller_reload__",
} as const;
const RUNTIME_CHUNK_ERROR_PATTERNS = [
  "Loading chunk",
  "ChunkLoadError",
  "dynamically imported module",
  "Failed to fetch dynamically imported module",
  "Unexpected token <",
  "MIME type of \"text/html\"",
] as const;



export { RUNTIME_CHUNK_ERROR_PATTERNS, RUNTIME_KINDS, RUNTIME_RELOAD_KEYS };


export type { RuntimeKind };
