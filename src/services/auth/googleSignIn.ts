import { createSignInWithGoogleUseCase } from "@/application/auth/SignInWithGoogle";
import type { GoogleAuthPort } from "@/application/ports/GoogleAuthPort";
import { googleAuthDesktopAdapter } from "@/infrastructure/auth/google/GoogleAuthDesktopAdapter";
import { googleAuthWebAdapter } from "@/infrastructure/auth/google/GoogleAuthWebAdapter";
import { selectGoogleAuthPort } from "@/infrastructure/auth/google/selectGoogleAuthPort";
import { getRuntimeKind } from "@/platform/runtimeKind";

let pendingSignInWithGoogle: Promise<void> | null = null;

const executeSignInWithGoogle = async (): Promise<void> => {
  const auth: GoogleAuthPort = selectGoogleAuthPort({
    webAuth: googleAuthWebAdapter,
    desktopAuth: googleAuthDesktopAdapter,
    runtimeKind: getRuntimeKind(),
    userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
  });

  const signInWithGoogleUseCase = createSignInWithGoogleUseCase({ auth });
  await signInWithGoogleUseCase.execute();
};

const signInWithGoogle = async (): Promise<void> => {
  if (pendingSignInWithGoogle) return pendingSignInWithGoogle;

  pendingSignInWithGoogle = executeSignInWithGoogle().finally(() => {
    pendingSignInWithGoogle = null;
  });

  return pendingSignInWithGoogle;
};

export { selectGoogleAuthPort, signInWithGoogle };
