// Compile-time guard: production build では false に畳み込まれる想定。
const DEV_MODE = import.meta.env.MODE === "development";
const PRIVATE_IPV4_PATTERNS = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
];

const isLocalHost = (hostname: string): boolean => hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
const isPrivateNetworkHost = (hostname: string): boolean => PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(hostname));
const isLocalDevHost = (hostname: string): boolean => isLocalHost(hostname) || isPrivateNetworkHost(hostname);

export { DEV_MODE, isLocalHost, isPrivateNetworkHost, isLocalDevHost };
