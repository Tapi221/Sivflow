import type { GoogleAuthPort } from "@/application/ports/GoogleAuthPort";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/infrastructure/firebase/client";

const signIn: GoogleAuthPort["signIn"] = async () => {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
};

export const googleAuthWebAdapter: GoogleAuthPort = {
  signIn,
};
