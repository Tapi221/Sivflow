import type { GoogleAuthPort } from "@/application/ports/GoogleAuthPort";
import { RUNTIME_KINDS, type RuntimeKind } from "@constants/shared/app";

type SelectGoogleAuthPortInput = { webAuth: GoogleAuthPort; desktopAuth: GoogleAuthPort; runtimeKind: RuntimeKind; userAgent: string };

const selectGoogleAuthPort = ({ webAuth, desktopAuth, runtimeKind, userAgent }: SelectGoogleAuthPortInput): GoogleAuthPort => {
  if (runtimeKind