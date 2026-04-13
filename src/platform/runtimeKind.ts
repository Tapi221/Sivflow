import { hasDesktopBridge } from "./detectDesktopBridge";

export type RuntimeKind = "web" | "desktop" | "ios" | "android";

export const getRuntimeKind = (): RuntimeKind => {
  if (hasDesktopBridge()) {
    return "desktop";
  }

  return "web";
};

export const isDesktopLikeRuntime = (): boolean =>
  getRuntimeKind() === "desktop";

export const isHandheldNativeRuntime = (): boolean => {
  const runtimeKind = getRuntimeKind();
  return runtimeKind === "ios" || runtimeKind === "android";
};
