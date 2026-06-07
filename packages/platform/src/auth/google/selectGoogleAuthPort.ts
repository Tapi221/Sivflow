import type { GoogleAuthPort } from "@/application/ports/GoogleAuthPort";
import { RUNTIME_KINDS, type RuntimeKind } from "@constants/shared/app";

type SelectGoogleAuthPortInput = { webAuth: GoogleAuthPort; desktopAuth: GoogleAuthPort; runtimeKind: RuntimeKind; userAgent: string };

const selectGoogleAuthPort = (input: SelectGoogleAuthPortInput): GoogleAuthPort => input.runtimeKind === RUNTIME_KINDS.desktop || input.userAgent.includes("Tauri") ?