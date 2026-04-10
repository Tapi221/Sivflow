import type { GoogleAuthPort } from "@/application/ports/GoogleAuthPort";
import { isDesktopRuntime } from "@/platform/runtime";

const isElectronRendererRuntime = (): boolean => {
  return (
    typeof navigator !== "undefined" &&
    /Electron\/\d+/i.test(navigator.userAgent)
  );
};

export interface SignInWithGoogleDependencies {
  webAuth: GoogleAuthPort;
  desktopAuth: GoogleAuthPort;
}

export const createSignInWithGoogleUseCase = ({
  webAuth,
  desktopAuth,
}: SignInWithGoogleDependencies) => {
  const execute = async (): Promise<void> => {
    if (isDesktopRuntime() || isElectronRendererRuntime()) {
      await desktopAuth.signIn();
      return;
    }

    await webAuth.signIn();
  };

  return {
    execute,
  };
};
