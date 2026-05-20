import * as admin from "firebase-admin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import type { SecurityEventType } from "../../functions/src/security/policy";

// Initialize Admin SDK
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
process.env.GCLOUD_PROJECT = "flashcard-master"; // Adjust if needed

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "flashcard-master",
  });
}

const db = getFirestore();

const CRITICAL_LOCK_SEQUENCE: readonly SecurityEventType[] = [
  "ACCESS_DENIED_REVOKED",
  "ACCESS_DENIED_REVOKED",
  "ACCESS_DENIED_REVOKED",
] as const;

const wait = async (ms: number) => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

const writeSecurityLog = async (
  userId: string,
  eventType: SecurityEventType,
  attempt: number,
) => {
  await db.collection(`users/${userId}/securityLogs`).add({
    userId,
    deviceId: "device_test",
    eventType,
    severity: "critical",
    source: "server",
    isUserVisible: false,
    description: `Verification event ${attempt}: ${eventType}`,
    metadata: { reason: "verify-security-signal" },
    occurredAt: Timestamp.now(),
  });
};

const verifySecuritySignal = async () => {
  const testUserId = "test_signal_user_" + Date.now();
  console.log(`[Verify] Starting verification for User: ${testUserId}`);

  // 1. Create initial user document
  await db.doc(`users/${testUserId}`).set({
    displayName: "Test Signal User",
    email: "test@example.com",
    createdAt: Timestamp.now(),
    isAccountLocked: false,
    requires2FA: false,
  });
  console.log("[Verify] User created.");

  // 2. Set up listener on user document to catch the lock signal
  const userRef = db.doc(`users/${testUserId}`);
  userRef.onSnapshot((snap) => {
    const data = snap.data();
    if (data?.isAccountLocked) {
      console.log("✅ [SUCCESS] Account lock signal received!");
      console.log("   Data:", JSON.stringify(data, null, 2));
      process.exit(0);
    }
  });

  for (const [index, eventType] of CRITICAL_LOCK_SEQUENCE.entries()) {
    const attempt = index + 1;
    console.log(
      `[Verify] Writing ${eventType} (${attempt}/${CRITICAL_LOCK_SEQUENCE.length})...`,
    );
    await writeSecurityLog(testUserId, eventType, attempt);
    await wait(500);
  }

  setTimeout(() => {
    console.error("❌ [TIMEOUT] Account was not locked in time.");
    process.exit(1);
  }, 10000);
};

verifySecuritySignal().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
