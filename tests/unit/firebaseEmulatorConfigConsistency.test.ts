import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { FIREBASE_EMULATORS } from "@constants/shared/firebase";

type FirebaseJson = {
  emulators?: Partial<
    Record<
      "auth" | "functions" | "firestore" | "storage",
      { host?: string; port?: number }
    >
  >;
};

const readFirebaseJson = (): FirebaseJson => {
  const raw = readFileSync(resolve(process.cwd(), "firebase.json"), "utf8");
  return JSON.parse(raw) as FirebaseJson;
};

describe("firebase emulator constants", () => {
  it("matches firebase.json emulator host and port", () => {
    const firebaseJson = readFirebaseJson();
    const emulators = firebaseJson.emulators;

    expect(emulators?.auth?.host).toBe(FIREBASE_EMULATORS.auth.host);
    expect(emulators?.auth?.port).toBe(FIREBASE_EMULATORS.auth.port);

    expect(emulators?.functions?.host).toBe(FIREBASE_EMULATORS.functions.host);
    expect(emulators?.functions?.port).toBe(FIREBASE_EMULATORS.functions.port);

    expect(emulators?.firestore?.host).toBe(FIREBASE_EMULATORS.firestore.host);
    expect(emulators?.firestore?.port).toBe(FIREBASE_EMULATORS.firestore.port);

    expect(emulators?.storage?.host).toBe(FIREBASE_EMULATORS.storage.host);
    expect(emulators?.storage?.port).toBe(FIREBASE_EMULATORS.storage.port);
  });
});
