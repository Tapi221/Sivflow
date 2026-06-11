import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import type { GoogleAuthPort } from "@/application/ports/GoogleAuthPort";
import { auth } from "@/infrastructure/firebase/client";

const googleAuthWebAdapter: GoogleAuthPort = { signIn };

const signIn: GoogleAuthPort["signIn"] = async () => {
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");
  await signInWithPopup(auth, provider);
};

export { googleAuthWebAdapter };
