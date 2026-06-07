import type { GoogleAuthPort } from "@/application/ports/GoogleAuthPort";
import { RUNTIME_KINDS, type RuntimeKind } from "@constants/shared/app";

type SelectGoogleAuthPortInput = {
  webAuth: GoogleAuthPort;
  desktopAuth: GoogleAuthPort;
  runtimeKind: RuntimeKind;
  userAgent: string;
};

const TAURI_USER_AGENT_MARKER = "Tauri";

const hasTauriUserAgent = (userAgent: string): boolean => userAgent.includes(TAURI_USER_AGENT_MARKER);

const selectGoogleAuthPort = ({
  webAuth,
  desktopAuth,
  runtimeKind,
  userAgent,
}: SelectGoogleAuthPortInput): GoogleAuthPort => {
  if (runtimeKind === RUNTIME_KINDS.desktop || hasTauriUserAgent(userAgent)) {
    return desktopAuth;
  }

  return webAuth;
};

export { selectGoogleAuthPort };
export