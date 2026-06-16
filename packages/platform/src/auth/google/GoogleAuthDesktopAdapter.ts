import { auth, functionsClient } from "@platform/firebase/client";
import { signInWithCustomToken } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import type { GoogleAuthPort } from "@/application/ports/GoogleAuthPort";
import { requestGoogleSignInServerCode } from "@/integration/google-integration/google.oauth";



const exchangeGoogleSignInCodeCallable = httpsCallable<{ code: string; codeVerifier: string; redirectUri: string; }, { firebaseToken: string; }>(functionsClient, "exchangeGoogleSignInCode");



const exchangeCodeForFirebaseToken = async (input: { code: string; codeVerifier: string; redirectUri: string; }): Promise<string> => {
  const result = await exchangeGoogleSignInCodeCallable(input);
  return result.data.firebaseToken;
};
const signIn: GoogleAuthPort["signIn"] = async () => {
  const input = await requestGoogleSignInServerCode();
  const firebaseToken = await exchangeCodeForFirebaseToken(input);
  await signInWithCustomToken(auth, firebaseToken);
};



const googleAuthDesktopAdapter: GoogleAuthPort = { signIn };



export { googleAuthDesktopAdapter };
