const FIREBASE_EMULATOR_HOST = "localhost";

export const FIREBASE_EMULATORS = {
  host: FIREBASE_EMULATOR_HOST,
  auth: {
    host: FIREBASE_EMULATOR_HOST,
    port: 9099,
    url: `http://${FIREBASE_EMULATOR_HOST}:9099`,
  },
  functions: {
    host: FIREBASE_EMULATOR_HOST,
    port: 5001,
  },
  firestore: {
    host: FIREBASE_EMULATOR_HOST,
    port: 8080,
  },
  storage: {
    host: FIREBASE_EMULATOR_HOST,
    port: 9199,
  },
} as const;
