export const BOOTSTRAP_RELOAD_KEYS = {
  chunk: "__hard_reload_once__",
  vitePreload: "__vite_preload_reload__",
  swController: "__sw_controller_reload__",
} as const;

export const CHUNK_ERROR_PATTERNS = [
  "Loading chunk",
  "ChunkLoadError",
  "dynamically imported module",
  "Failed to fetch dynamically imported module",
  "Unexpected token <",
  'MIME type of "text/html"',
] as const;
