import type { GoogleAuthPort } from "@/application/ports/GoogleAuthPort";

type SelectGoogleAuthPortInput = { webAuth: GoogleAuthPort; desktopAuth: GoogleAuthPort; runtimeKind: "web" | "desktop"; userAgent: string };

const selectGoogleAuthPort = ({ webAuth, desktopAuth, runtimeKind, userAgent }: SelectGoogleAuthPortInput): GoogleAuthPort => {
  if (runtimeKind === "desktop")