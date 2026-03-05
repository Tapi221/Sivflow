import { initializeDB, getLocalDb } from "../src/services/localDB";
import { Card } from "../src/types";

// データ補正用スクリプト
async function patchAllCards(userId: string) {
  initializeDB(userId);
  const db = getLocalDb();
  const cards: Card[] = await db.getAllCards();
  const now = new Date();
  let patched = 0;

  for (const card of cards) {
    let changed = false;
    const changes: Partial<Card> = {};

    // S（記憶強度）
    if (
      typeof card.memoryStability !== "number" ||
      isNaN(card.memoryStability)
    ) {
      changes.memoryStability = 35; // S_init: 初期値
      changed = true;
    }
    // 状態
    if (!("state" in card) || !card.state) {
      changes.state = card.lastReviewAt ? "STABLE" : "PRE-LEARN";
      changed = true;
    }
    // 次回復習日
    if (!card.nextReviewDate) {
      changes.nextReviewDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1日後
      changed = true;
    }
    // 型変換（Timestamp→Date）
    if (card.nextReviewDate && typeof card.nextReviewDate !== "object") {
      changes.nextReviewDate = new Date(card.nextReviewDate);
      changed = true;
    }
    // ここでpatch
    if (changed) {
      await db.updateItem("cards", card.id, changes);
      patched++;
    }
  }
  console.log(`Patched ${patched} cards.`);
}

// 実行例（ユーザーIDは適宜指定）
patchAllCards("test-user-id").then(() => {
  console.log("カードデータ補正完了");
});
