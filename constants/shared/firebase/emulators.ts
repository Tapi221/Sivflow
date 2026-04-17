const FIREBASE_EMULATOR_HOST = "localhost";

export const FIREBASE_EMULATOR_PORTS = {
  auth: 9099,
  functions: 5001,
  firestore: 8080,
  storage: 9199,
} as const;

export const FIREBASE_EMULATORS = {
  host: FIREBASE_EMULATOR_HOST,
  auth: {
    host: FIREBASE_EMULATOR_HOST,
    port: FIREBASE_EMULATOR_PORTS.auth,
    url: `http://${FIREBASE_EMULATOR_HOST}:${FIREBASE_EMULATOR_PORTS.auth}`,
  },
  functions: {
    host: FIREBASE_EMULATOR_HOST,
    port: FIREBASE_EMULATOR_PORTS.functions,
  },
  firestore: {
    host: FIREBASE_EMULATOR_HOST,
    port: FIREBASE_EMULATOR_PORTS.firestore,
  },
  storage: {
    host: FIREBASE_EMULATOR_HOST,
    port: FIREBASE_EMULATOR_PORTS.storage,
  },
} as const;
