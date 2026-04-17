export const RUNTIME_KINDS = {
  web: "web",
  desktop: "desktop",
  ios: "ios",
  android: "android",
} as const;

export type RuntimeKind = (typeof RUNTIME_KINDS)[keyof typeof RUNTIME_KINDS];
