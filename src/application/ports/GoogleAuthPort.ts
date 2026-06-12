interface GoogleAuthPort {
  signIn: () => Promise<void>;
}

export type { GoogleAuthPort };
