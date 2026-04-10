import { createSignInWithGoogleUseCase } from "@/application/auth/SignInWithGoogle";
import { googleAuthDesktopAdapter } from "@/infrastructure/auth/google/GoogleAuthDesktopAdapter";
import { googleAuthWebAdapter } from "@/infrastructure/auth/google/GoogleAuthWebAdapter";

const signInWithGoogleUseCase = createSignInWithGoogleUseCase({
  webAuth: googleAuthWebAdapter,
  desktopAuth: googleAuthDesktopAdapter,
});

export const signInWithGoogle = async (): Promise<void> => {
  await signInWithGoogleUseCase.execute();
};
