import type { RuntimeKind } from "@/platform/runtimeKind";

export type PresentationTarget = "desktop" | "mobile";

export const getPresentationTarget = ({
  runtimeKind,
}: {
  runtimeKind: RuntimeKind;
}): PresentationTarget => {
  switch (runtimeKind) {
    case "desktop":
      return "desktop";
    case "ios":
    case "android":
    case "web":
    default:
      return "mobile";
  }
};
