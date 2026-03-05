import * as admin from "firebase-admin";

// Initialize Admin SDK
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
process.env.GCLOUD_PROJECT = "flashcard-master";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "flashcard-master",
  });
}

const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;

async function verifySecuritySignal() {
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

  // 2. Set up listener or polling
  // onSnapshot works in Node with admin SDK
  const userRef = db.doc(`users/${testUserId}`);
  const unsubscribe = userRef.onSnapshot((snap) => {
    const data = snap.data();
    if (data?.isAccountLocked) {
      console.log("✅ [SUCCESS] Account lock signal received!");
      console.log("   Data:", JSON.stringify(data, null, 2));
      process.exit(0);
    }
  });

  // 3. Trigger High Risk Event
  const highRiskLog = {
    userId: testUserId,
    eventType: "abnormal_pattern",
    details: { reason: "Test High Risk" },
    timestamp: Timestamp.now(),
    userAgent: "TestScript",
    ipAddress: "127.0.0.1",
    deviceId: "device_test",
    severity: "critical",
  };

  console.log("[Verify] Writing critical security log...");
  // Log to users/{userId}/securityLogs
  await db.collection(`users/${testUserId}/securityLogs`).add(highRiskLog);

  // Wait for a bit and add another if needed
  setTimeout(async () => {
    console.log("[Verify] Waiting for lock... (Injecting 2nd log)");
    await db.collection(`users/${testUserId}/securityLogs`).add({
      ...highRiskLog,
      timestamp: Timestamp.now(),
      details: { reason: "Second Hit" },
    });
  }, 2000);

  setTimeout(() => {
    console.error("❌ [TIMEOUT] Account was not locked in time.");
    unsubscribe();
    process.exit(1);
  }, 15000);
}

verifySecuritySignal().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
