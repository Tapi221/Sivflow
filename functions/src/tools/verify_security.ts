import * as admin from 'firebase-admin';

// エミュレータ接続設定
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';
process.env.GCLOUD_PROJECT = 'anki-70f73';

// 初期化
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'anki-70f73'
  });
}

const db = admin.firestore();

async function main() {
  const userId = 'verify-user-001';
  const deviceId = 'verify-device-A';

  console.log(`\n=== Security Functions Verification Start: ${userId} ===\n`);

  // 1. Setup: デバイスと初期ステータス
  await db.doc(`users/${userId}`).set({ email: 'test@example.com' });
  await db.doc(`sync_metadata/${userId}/devices/${deviceId}`).set({
    status: 'active',
    lastSyncTime: new Date()
  });
  // ステータス初期化
  await db.doc(`users/${userId}/security/status`).delete();
  await db.doc(`users/${userId}`).update({ isAccountLocked: false, requires2FA: false }).catch(() => {});
  // 必要に応じてログ削除
//   const logs = await db.collection(`users/${userId}/securityLogs`).get();
//   const batch = db.batch();
//   logs.docs.forEach(d => batch.delete(d.ref));
//   await batch.commit();

  console.log('[Setup] Created user and device.');

  // 2. Test 1: Warning Level (Score >= 21) => Notifications
  // SYNC_AUTH_ERROR (+10) x 3回 => +30点
  console.log('[Test 1] Injecting logs for Warning level...');
  for (let i = 0; i < 3; i++) {
    await db.collection(`users/${userId}/securityLogs`).add({
      eventType: 'SYNC_AUTH_ERROR',
      deviceId: deviceId,
      occurredAt: admin.firestore.Timestamp.now(), // Timestamp型を使う
      severity: 'warning'
    });
    // Functionsの処理待ち
    await new Promise(r => setTimeout(r, 5000));
  }

  // 検証: Notifications
  // 少し待機
  await new Promise(r => setTimeout(r, 5000));
  
  const notifs = await db.collection(`users/${userId}/notifications`).orderBy('createdAt', 'desc').get();
  console.log(`[Verify 1] Notifications count: ${notifs.size} (Expected >= 1)`);
  if (notifs.size > 0) {
      console.log(' -> OK: Notification found.');
      notifs.docs.forEach(d => console.log('    - Message:', d.data().message));
  } else {
      console.error(' -> FAIL: No notifications.');
  }

  const status1 = await db.doc(`users/${userId}/security/status`).get();
  const score1 = status1.data()?.riskScore;
  console.log(`[Verify 1] Current Score: ${score1} (Expected around 30)`);


  // 3. Test 2: Critical Level (Score >= 81) => Account Lock + Revoke
  // ADMIN_ACCOUNT_LOCK (+50)
  // 現状 30点なので +50 = 80点. さらにもう一発で確実に超えさせる
  console.log('\n[Test 2] Injecting logs for Critical level...');
  await db.collection(`users/${userId}/securityLogs`).add({
    eventType: 'ADMIN_ACCOUNT_LOCK',
    deviceId: deviceId,
    occurredAt: admin.firestore.Timestamp.now(),
    severity: 'critical'
  });
  await db.collection(`users/${userId}/securityLogs`).add({
    eventType: 'ADMIN_ACCOUNT_LOCK',
    deviceId: deviceId,
    occurredAt: admin.firestore.Timestamp.now(),
    severity: 'critical'
  });
  
  await new Promise(r => setTimeout(r, 6000));

  // 検証: Account Lock
  const userDoc = await db.doc(`users/${userId}`).get();
  const isLocked = userDoc.data()?.isAccountLocked;
  console.log(`[Verify 2] isAccountLocked: ${isLocked} (Expected: true)`);
  
  // 検証: Device Revoke
  const devDoc = await db.doc(`sync_metadata/${userId}/devices/${deviceId}`).get();
  const devStatus = devDoc.data()?.status;
  console.log(`[Verify 2] Device Status: ${devStatus} (Expected: revoked)`);

  const status2 = await db.doc(`users/${userId}/security/status`).get();
  const score2 = status2.data()?.riskScore;
  console.log(`[Verify 2] Final Score: ${score2} (Expected 100 capped)`);

  console.log('\n=== Verification Completed ===');
}

main().catch(console.error);
