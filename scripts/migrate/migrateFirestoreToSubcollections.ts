/**
 * Firestore データ移行スクリプト
 *
 * 旧トップレベルコレクション → /users/{userId}/ サブコレクション構造への移行
 *
 * 移行対象:
 *   /folders/{id} → /users/{userId}/folders/{id}
 *   /cards/{id} → /users/{userId}/cards/{id}
 *
 * 実行方法:
 *   npx tsx scripts/migrate/migrateFirestoreToSubcollections.ts [--dry-run] [--verbose]
 *
 * オプション:
 *   --dry-run: 実際の書き込みを行わず、移行対象のみ表示
 *   --verbose: 詳細ログを出力（skip理由など）
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// サービスアカウントキーのパス
const SERVICE_ACCOUNT_PATH = path.join(
  __dirname,
  "..",
  "serviceAccountKey.json",
);

// コマンドライン引数
const args = process.argv.slice(2);
const isHelp = args.includes("--help");
const isDryRun = args.includes("--dry-run");
const isVerbose = args.includes("--verbose");

if (isHelp) {
  console.log(`
Usage:
  npx tsx scripts/migrate/migrateFirestoreToSubcollections.ts [options]

Options:
  --dry-run     書き込みを行わず、移行対象のみ表示
  --verbose     詳細ログを表示
  --help        このヘルプを表示

⚠️ オプションなしの場合は本番書き込みを行います
`);
  process.exit(0);
}

const DRY_RUN = isDryRun;
const VERBOSE = isVerbose;

// 統計情報
interface MigrationStats {
  folders: {
    total: number;
    migrated: number;
    skipped: number;
    errors: number;
    noUserId: number;
  };
  cards: {
    total: number;
    migrated: number;
    skipped: number;
    errors: number;
    noUserId: number;
  };
}

const stats: MigrationStats = {
  folders: { total: 0, migrated: 0, skipped: 0, errors: 0, noUserId: 0 },
  cards: { total: 0, migrated: 0, skipped: 0, errors: 0, noUserId: 0 },
};

/**
 * Firebase Admin SDK 初期化
 */
function initializeFirebase() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(
      `❌ サービスアカウントキーが見つかりません: ${SERVICE_ACCOUNT_PATH}`,
    );
    console.error(
      "   Firebase Console からサービスアカウントキーをダウンロードし、プロジェクトルートに配置してください。",
    );
    process.exit(1);
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"),
  );

  initializeApp({
    credential: cert(serviceAccount),
  });

  console.log("✅ Firebase Admin SDK 初期化完了\n");
}

/**
 * フォルダの移行
 */
async function migrateFolders() {
  console.log("📁 フォルダの移行を開始...\n");

  const db = getFirestore();
  const oldFoldersRef = db.collection("folders");
  const snapshot = await oldFoldersRef.get();

  stats.folders.total = snapshot.size;
  console.log(`   対象: ${snapshot.size} 件\n`);

  for (const doc of snapshot.docs) {
    const docId = doc.id;
    const data = doc.data();
    const userId = data.userId;

    // userId が存在しない場合
    if (!userId) {
      stats.folders.noUserId++;
      console.warn(`⚠️  [FOLDER] ${docId}: userId が存在しないためスキップ`);
      continue;
    }

    // 新パスの参照
    const newFolderRef = db
      .collection("users")
      .doc(userId)
      .collection("folders")
      .doc(docId);

    try {
      // 既存チェック
      const existingDoc = await newFolderRef.get();

      if (existingDoc.exists) {
        stats.folders.skipped++;

        if (VERBOSE) {
          const existingData = existingDoc.data()!;
          const oldUpdatedAt = data.updatedAt?.toDate?.() || null;
          const newUpdatedAt = existingData.updatedAt?.toDate?.() || null;

          console.log(`⏭️  [FOLDER] ${docId} (ユーザー: ${userId})`);
          console.log(`    理由: 新パスに既に存在`);

          if (oldUpdatedAt && newUpdatedAt) {
            const timeDiff = newUpdatedAt.getTime() - oldUpdatedAt.getTime();
            if (timeDiff !== 0) {
              console.log(
                `    差分: 旧=${oldUpdatedAt.toISOString()} / 新=${newUpdatedAt.toISOString()} (差: ${timeDiff}ms)`,
              );
            }
          }
          console.log();
        }
        continue;
      }

      // 移行実行
      if (DRY_RUN) {
        console.log(
          `🔍 [DRY-RUN] フォルダ ${docId} → users/${userId}/folders/${docId}`,
        );
        stats.folders.migrated++;
      } else {
        await newFolderRef.set({
          ...data,
          migratedAt: FieldValue.serverTimestamp(),
          migratedFrom: "top-level-collection",
        });
        stats.folders.migrated++;
        console.log(`✅ [FOLDER] ${docId} → users/${userId}/folders/${docId}`);
      }
    } catch (error) {
      stats.folders.errors++;
      console.error(`❌ [FOLDER] ${docId} の移行に失敗:`, error);
    }
  }

  console.log(`\n📁 フォルダ移行完了\n`);
}

/**
 * カードの移行
 */
async function migrateCards() {
  console.log("🃏 カードの移行を開始...\n");

  const db = getFirestore();
  const oldCardsRef = db.collection("cards");
  const snapshot = await oldCardsRef.get();

  stats.cards.total = snapshot.size;
  console.log(`   対象: ${snapshot.size} 件\n`);

  for (const doc of snapshot.docs) {
    const docId = doc.id;
    const data = doc.data();
    const userId = data.userId;

    // userId が存在しない場合
    if (!userId) {
      stats.cards.noUserId++;
      console.warn(`⚠️  [CARD] ${docId}: userId が存在しないためスキップ`);
      continue;
    }

    // 新パスの参照
    const newCardRef = db
      .collection("users")
      .doc(userId)
      .collection("cards")
      .doc(docId);

    try {
      // 既存チェック
      const existingDoc = await newCardRef.get();

      if (existingDoc.exists) {
        stats.cards.skipped++;

        if (VERBOSE) {
          const existingData = existingDoc.data()!;
          const oldUpdatedAt = data.updatedAt?.toDate?.() || null;
          const newUpdatedAt = existingData.updatedAt?.toDate?.() || null;

          console.log(`⏭️  [CARD] ${docId} (ユーザー: ${userId})`);
          console.log(`    理由: 新パスに既に存在`);

          if (oldUpdatedAt && newUpdatedAt) {
            const timeDiff = newUpdatedAt.getTime() - oldUpdatedAt.getTime();
            if (timeDiff !== 0) {
              console.log(
                `    差分: 旧=${oldUpdatedAt.toISOString()} / 新=${newUpdatedAt.toISOString()} (差: ${timeDiff}ms)`,
              );
            }
          }
          console.log();
        }
        continue;
      }

      // 移行実行
      if (DRY_RUN) {
        console.log(
          `🔍 [DRY-RUN] カード ${docId} → users/${userId}/cards/${docId}`,
        );
        stats.cards.migrated++;
      } else {
        await newCardRef.set({
          ...data,
          migratedAt: FieldValue.serverTimestamp(),
          migratedFrom: "top-level-collection",
        });
        stats.cards.migrated++;
        console.log(`✅ [CARD] ${docId} → users/${userId}/cards/${docId}`);
      }
    } catch (error) {
      stats.cards.errors++;
      console.error(`❌ [CARD] ${docId} の移行に失敗:`, error);
    }
  }

  console.log(`\n🃏 カード移行完了\n`);
}

/**
 * 統計情報を表示
 */
function printStats() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 移行統計");
  console.log("=".repeat(60));

  console.log("\n📁 フォルダ:");
  console.log(`   合計:         ${stats.folders.total} 件`);
  console.log(`   移行完了:     ${stats.folders.migrated} 件`);
  console.log(
    `   スキップ:     ${stats.folders.skipped} 件 (既に新パスに存在)`,
  );
  console.log(`   userId なし:  ${stats.folders.noUserId} 件`);
  console.log(`   エラー:       ${stats.folders.errors} 件`);

  console.log("\n🃏 カード:");
  console.log(`   合計:         ${stats.cards.total} 件`);
  console.log(`   移行完了:     ${stats.cards.migrated} 件`);
  console.log(`   スキップ:     ${stats.cards.skipped} 件 (既に新パスに存在)`);
  console.log(`   userId なし:  ${stats.cards.noUserId} 件`);
  console.log(`   エラー:       ${stats.cards.errors} 件`);

  console.log("\n" + "=".repeat(60) + "\n");

  const hasErrors = stats.folders.errors > 0 || stats.cards.errors > 0;
  const hasNoUserId = stats.folders.noUserId > 0 || stats.cards.noUserId > 0;

  if (DRY_RUN) {
    console.log(
      "ℹ️  DRY-RUN モードで実行しました。実際の書き込みは行われていません。",
    );
    console.log(
      "   本番実行する場合は --dry-run オプションを外してください。\n",
    );
  } else {
    console.log("✅ 移行が完了しました。\n");
  }

  if (hasErrors) {
    console.warn(
      "⚠️  一部のドキュメントでエラーが発生しました。ログを確認してください。\n",
    );
  }

  if (hasNoUserId) {
    console.warn("⚠️  userId が存在しないドキュメントがありました。");
    console.warn(
      "   これらのドキュメントは移行されていません。手動で確認してください。\n",
    );
  }
}

/**
 * メイン実行
 */
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 Firestore データ移行スクリプト");
  console.log("=".repeat(60) + "\n");

  console.log(
    "モード:",
    DRY_RUN ? "🔍 DRY-RUN (書き込みなし)" : "✍️  本番実行",
  );
  console.log("詳細ログ:", VERBOSE ? "有効" : "無効");
  console.log();

  if (!DRY_RUN) {
    console.log(
      "⚠️  警告: 本番モードで実行します。Firestoreに書き込みが行われます。",
    );
    console.log(
      "   10秒後に開始します。中止する場合は Ctrl+C を押してください。\n",
    );
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  initializeFirebase();

  try {
    await migrateFolders();
    await migrateCards();
    printStats();

    process.exit(hasErrors() ? 1 : 0);
  } catch (error) {
    console.error("\n❌ 移行中に予期しないエラーが発生しました:", error);
    process.exit(1);
  }
}

function hasErrors(): boolean {
  return stats.folders.errors > 0 || stats.cards.errors > 0;
}

// 実行
main();
