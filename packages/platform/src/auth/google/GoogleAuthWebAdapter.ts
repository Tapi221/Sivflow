import { signInWithCustomToken } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import type { GoogleAuthPort } from "@/application/ports/GoogleAuthPort";
import { auth, functionsClient } from "@/infrastructure/firebase/client";
import { requestGoogleCalendarServerCode } from "@/integration/google-integration/google.oauth";

const exchangeGoogleSignInCodeCallable = httpsCallable<{ code: string; codeVerifier: string; redirectUri: string }, { firebaseToken: string }>(functionsClient, "exchangeGoogleSignInCode");

const exchangeCodeForFirebaseToken = async ({ code, codeVerifier, redirectUri }: { code: string; codeVerifier: string; redirectUri: string }): Promise<string> => {
  const result = await exchangeGoogleSignInCodeCallable({ code, codeVerifier, redirectUri });
  return result.data.firebaseToken;
};

const signIn: GoogleAuthPort["signIn"] = async () => {
  const { code, codeVerifier, redirectUri } = await requestGoogleCalendarServerCode(auth);
  const firebaseToken = await exchangeCodeForFirebaseToken({ code, codeVerifier, redirectUri });
  await signInWithCustomToken(auth, firebaseToken);
};

export const googleAuthWebAdapter: GoogleAuthPort = {
  signIn,
};
