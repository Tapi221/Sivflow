export const DESKTOP_OAUTH_LOOPBACK = {
  host: "127.0.0.1",
  port: 42813,
  path: "/",
} as const;

export const DESKTOP_GOOGLE_OAUTH_REDIRECT_URI = `http://${DESKTOP_OAUTH_LOOPBACK.host}:${DESKTOP_OAUTH_LOOPBACK.port}`;
