import type { GoogleAuthPort } from "@/application/ports/GoogleAuthPort";



interface SignInWithGoogleDependencies {
  auth: GoogleAuthPort;
}



const createSignInWithGoogleUseCase = ({ auth }: SignInWithGoogleDependencies) => {
  const execute = async (): Promise<void> => {
    await auth.signIn();
  };

  return {
    execute,
  };
};



export { createSignInWithGoogleUseCase };


export type { SignInWithGoogleDependencies };
