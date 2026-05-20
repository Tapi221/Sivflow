import type { RuntimeKind } from "@constants/shared/app";

import type { GoogleAuthPort } from "@/application/ports/GoogleAuthPort";

const isElectronRendererRuntime = (userAgent: string): boolean =>
  /Electron\/\d+/i.test(userAgent);

export const selectGoogleAuthPort = ({
  webAuth,
  desktopAuth,
  runtimeKind,
  userAgent,
}: {
  webAuth: GoogleAuthPort;
  desktopAuth: GoogleAuthPort;
  runtimeKind: RuntimeKind;
  userAgent: string;
}): GoogleAuthPort => {
  if (
    runtimeKind === "desktop" ||
    runtimeKind === "ios" ||
    runtimeKind === "android" ||
    isElectronRendererRuntime(userAgent)
  ) {
    return desktopAuth;
  }

  return webAuth;
};
