import type { RuntimeKind } from "@constants/shared/app";
import type { GoogleAuthPort } from "@/application/ports/GoogleAuthPort";

export const selectGoogleAuthPort = ({
  webAuth,
  desktopAuth,
  runtimeKind,
}: {
  webAuth: GoogleAuthPort;
  desktopAuth: GoogleAuthPort;
  runtimeKind: RuntimeKind;
  userAgent: string;
}): GoogleAuthPort => {
  if (
    runtimeKind === "desktop" ||
    runtimeKind === "ios" ||
    runtimeKind === "android"
  ) {
    return desktopAuth;
  }

  return webAuth;
};
