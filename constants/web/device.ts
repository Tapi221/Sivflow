export const DEVICE_LABELS = {
  server: "Server",
  webBrowser: "Web Browser",
  android: "Android",
  ios: "iOS",
  windowsPc: "Windows PC",
  mac: "Mac",
  linuxPc: "Linux PC",
  app: "App",
  edge: "Edge",
  chrome: "Chrome",
  safari: "Safari",
  firefox: "Firefox",
  browser: "Browser",
} as const;

export const DEVICE_USER_AGENT_PATTERNS = {
  android: /Android/i,
  ios: /iPhone|iPad|iPod/i,
  windows: /Windows/i,
  mac: /Macintosh/i,
  linux: /Linux/i,
  edge: /Edg\//i,
  chrome: /Chrome/i,
  safari: /Safari/i,
  firefox: /Firefox/i,
} as const;

export const DEVICE_STANDALONE_MEDIA_QUERY = "(display-mode: standalone)";
