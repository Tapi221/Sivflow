import type { GoogleAuthPort } from "@/application/ports/GoogleAuthPort";

export interface SignInWithGoogleDependencies {
  auth: GoogleAuthPort;
}

export const createSignInWithGoogleUseCase = ({
  auth,
}: SignInWithGoogleDependencies) => {
  const execute = async (): Promise<void> => {
    await auth.signIn();
  };

  return {
    execute,
  };
};
