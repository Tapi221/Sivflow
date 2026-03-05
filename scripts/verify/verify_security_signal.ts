import * as admin from "firebase-admin";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";

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

  // 2. Set up listener on user document to catch the lock signal
  const userRef = db.doc(`users/${testUserId}`);
  const unsubscribe = userRef.onSnapshot((snap) => {
    const data = snap.data();
    if (data?.isAccountLocked) {
      console.log("✅ [SUCCESS] Account lock signal received!");
      console.log("   Data:", JSON.stringify(data, null, 2));
      process.exit(0);
    }
  });

  // 3. Trigger High Risk Event (simulating client-side log)
  // We send enough events to trigger a lock.
  // Assuming threshold is > 80 or something.
  // Let's send a CRITICAL event if logic handles it, or multiple high events.
  // Based on `functions/src/security/index.ts`:
  // Risk Score += log.severity * 10.
  // Thresholds: Critical (80) -> Lock.

  // So 1 Critical event (severity 5? or just manual score?)
  // Logic: score += (5 - 1) * 10 ? No, let's look at logic.
  // calculateRiskScore adds based on new logs.
  // Let's inject a log with high severity.

  // Actually, the `security_logs` trigger updates the score.
  // Let's add a "concurrent_login" detected event.

  const highRiskLog = {
    userId: testUserId,
    eventType: "abnormal_pattern", // This might trigger detection
    details: { reason: "Test High Risk" },
    timestamp: Timestamp.now(),
    userAgent: "TestScript",
    ipAddress: "127.0.0.1",
    deviceId: "device_test",
    severity: "critical", // severity: 'critical' usually implies high score impact
  };

  console.log("[Verify] Writing critical security log...");
  await db.collection(`users/${testUserId}/securityLogs`).add(highRiskLog);

  // Also manually boost score if the function logic relies on previous score?
  // The function `onLogCreated` calculates score.
  // If severity is 'critical', it should add significant score.

  // Wait for a bit
  setTimeout(async () => {
    console.log("[Verify] Waiting for lock...");
    // If single log isn't enough, add more.
    await db.collection(`users/${testUserId}/securityLogs`).add({
      ...highRiskLog,
      timestamp: Timestamp.now(),
      details: { reason: "Second Hit" },
    });
  }, 2000);

  setTimeout(() => {
    console.error("❌ [TIMEOUT] Account was not locked in time.");
    process.exit(1);
  }, 10000);
}

verifySecuritySignal().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
