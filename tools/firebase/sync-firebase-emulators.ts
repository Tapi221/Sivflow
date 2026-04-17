import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { FIREBASE_EMULATORS } from "../../constants/shared/firebase";

type FirebaseEmulatorNode = {
  host?: string;
  port?: number;
  [key: string]: unknown;
};

type FirebaseJson = {
  emulators?: Record<string, FirebaseEmulatorNode>;
  [key: string]: unknown;
};

const ROOT = process.cwd();
const FIREBASE_JSON_PATH = resolve(ROOT, "firebase.json");

const readFirebaseJson = (): FirebaseJson => {
  const raw = readFileSync(FIREBASE_JSON_PATH, "utf8");
  return JSON.parse(raw) as FirebaseJson;
};

const upsertHostPort = (
  emulators: Record<string, FirebaseEmulatorNode>,
  key: "auth" | "functions" | "firestore" | "storage",
  host: string,
  port: number,
) => {
  const current = emulators[key] ?? {};
  emulators[key] = {
    ...current,
    host,
    port,
  };
};

const syncFirebaseEmulators = () => {
  const parsed = readFirebaseJson();
  const emulators = parsed.emulators ?? {};

  upsertHostPort(
    emulators,
    "auth",
    FIREBASE_EMULATORS.auth.host,
    FIREBASE_EMULATORS.auth.port,
  );
  upsertHostPort(
    emulators,
    "functions",
    FIREBASE_EMULATORS.functions.host,
    FIREBASE_EMULATORS.functions.port,
  );
  upsertHostPort(
    emulators,
    "firestore",
    FIREBASE_EMULATORS.firestore.host,
    FIREBASE_EMULATORS.firestore.port,
  );
  upsertHostPort(
    emulators,
    "storage",
    FIREBASE_EMULATORS.storage.host,
    FIREBASE_EMULATORS.storage.port,
  );

  const next: FirebaseJson = {
    ...parsed,
    emulators,
  };

  writeFileSync(FIREBASE_JSON_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log("[sync-firebase-emulators] firebase.json emulators synchronized");
};

syncFirebaseEmulators();
