import { createSignInWithGoogleUseCase } from "@/application/auth/SignInWithGoogle";
import type { GoogleAuthPort } from "@/application/ports/GoogleAuthPort";
import { googleAuthDesktopAdapter } from "@/infrastructure/auth/google/GoogleAuthDesktopAdapter";
import { googleAuthWebAdapter } from "@/infrastructure/auth/google/GoogleAuthWebAdapter";
import { isDesktopRuntime } from "@/platform/runtime";

const isElectronRendererRuntime = (userAgent: string): boolean =>
  /Electron\/\d+/i.test(userAgent);

export const selectGoogleAuthPort = ({
  webAuth,
  desktopAuth,
  isDesktop,
  userAgent,
}: {
  webAuth: GoogleAuthPort;
  desktopAuth: GoogleAuthPort;
  isDesktop: boolean;
  userAgent: string;
}): GoogleAuthPort => {
  if (isDesktop || isElectronRendererRuntime(userAgent)) {
    return desktopAuth;
  }

  return webAuth;
};

export const signInWithGoogle = async (): Promise<void> => {
  const auth = selectGoogleAuthPort({
    webAuth: googleAuthWebAdapter,
    desktopAuth: googleAuthDesktopAdapter,
    isDesktop: isDesktopRuntime(),
    userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
  });

  const signInWithGoogleUseCase = createSignInWithGoogleUseCase({ auth });
  await signInWithGoogleUseCase.execute();
};
