import { auth } from "@platform/firebase/client";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import type { GoogleAuthPort } from "@/application/ports/GoogleAuthPort";



const signIn: GoogleAuthPort["signIn"] = async () => {
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");
  await signInWithPopup(auth, provider);
};



const googleAuthWebAdapter: GoogleAuthPort = { signIn };



export { googleAuthWebAdapter };
