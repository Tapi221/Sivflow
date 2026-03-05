import type { Card } from "../src/types/index";

// シミュレーション用：状態遷移・S・Iの変化をテスト
function simulateCardScenario(
  card: Card,
  scenario: Array<"success" | "fail" | "delay" | "view">,
) {
  let S = card.memoryStability ?? 35;
  let state = card.state ?? "PRE-LEARN";
  let I = 1; // 初期間隔
  const now = new Date();
  let nextReviewDate =
    card.nextReviewDate ?? new Date(now.getTime() + I * 24 * 60 * 60 * 1000);
  const λ = 0.15; // 忘却率
  const β = 0.5; // 失敗時減衰
  const S_success = 10; // 成功時強化量
  const penalty_miss = 0.7;
  const relearn_cap = 1;

  for (const event of scenario) {
    if (event === "success") {
      S += S_success;
      state = "STABLE";
      I = I * 1.8;
      nextReviewDate = new Date(now.getTime() + I * 24 * 60 * 60 * 1000);
    } else if (event === "fail") {
      S *= β;
      state = "FAILED";
      I = Math.min(I * 0.3, relearn_cap);
      nextReviewDate = new Date(now.getTime() + I * 24 * 60 * 60 * 1000);
    } else if (event === "delay") {
      S = S * Math.exp(-λ * I);
      state = "DECAYING";
      I = I * penalty_miss;
      nextReviewDate = new Date(now.getTime() + I * 24 * 60 * 60 * 1000);
    } else if (event === "view") {
      S = Math.max(S, 35);
      // stateは変化なし
    }
    const nextReviewStr =
      nextReviewDate instanceof Date
        ? nextReviewDate.toISOString()
        : (
            nextReviewDate as { toDate?: () => Date }
          ).toDate?.().toISOString() ?? new Date(nextReviewDate).toISOString();
    console.log(
      `Event: ${event}, S: ${S.toFixed(2)}, state: ${state}, I: ${I.toFixed(2)}, nextReviewDate: ${nextReviewStr}`,
    );
  }
}

// テスト例
const testCard: Card = {
  id: "test",
  userId: "test",
  folderId: "",
  orderIndex: 0,
  questionNumber: "",
  isDraft: false,
  hasUncertainty: false,
  isCompleted: false,
  isSilent: false,
  questionText: "",
  questionImages: [],
  questionAudios: [],
  questionMemo: "",
  questionMarked: "",
  answerText: "",
  answerImages: [],
  answerAudios: [],
  answerMemo: "",
  answerMarked: "",
  memoryStability: 35,
  nextReviewDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deviceId: "",
  state: "PRE-LEARN",
  isDeleted: false,
};

simulateCardScenario(testCard, ["success", "delay", "fail", "view", "success"]);
