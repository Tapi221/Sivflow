/**
 * Review Metrics Logic
 *
 * 内部的な Memory Stability (S) とは独立した、UI表示専用の指標計算ロジック。
 *
 * 1. Retention (定着度): 次回の復習時刻における記憶保持確率 (Probability)。
 * 2. Resistance (耐性スコア): 現在設定されている復習間隔の相対的な長さ (Strength)。
 */

const MAX_INTERVAL_DAYS = 90;



/**
 * 忘却曲線に基づく記憶保持確率（定着度）を計算します。
 *
 * @param stabilityInternal - 内部Memory Stability (0.01 - 1.0)
 * @param intervalDays - 次回復習までの日数 (または経過日数)
 * @returns 0〜100 (%)
 *
 * @note
 * これは「記憶の量」や「学習達成度」ではありません。
 * あくまで「指定された日数が経過した時点で、忘れずにいられる確率（推定値）」です。
 * 復習直後は 100% に近く、時間が経つにつれて指数関数的に減少します。
 * 実際の想起成功を保証するものではありません。
 */
const calculateRetentionProbability = (stabilityInternal: number, intervalDays: number): number => {
  // 安全策: Stabilityが0以下にならないようにする
  const S = Math.max(0.01, stabilityInternal);

  // 安全策: 日数が負にならないようにする
  const I = Math.max(0, intervalDays);

  // FSRS公式の簡易版: P = e^( -I / (S * 100) )
  // Stabilityが 1.0 のとき、100日で忘却率が e^-1 (約37%) になるスケール
  // ここでは S は 0.01-1.0 なので、S*100 = 1-100 となる
  const decayFactor = 100;
  const probability = Math.exp(-I / (S * decayFactor));

  // %表記のために100倍し、整数に丸める
  return Math.round(probability * 100);
};
/**
 * 復習間隔の長さに基づく耐性スコアを計算します。
 *
 * @param intervalDays - 現在設定されている復習間隔 (日数)
 * @returns 0〜100 (%)
 *
 * @note
 * これは「どれくらい長い間隔に耐えられているか」を示す指標です。
 * 記憶の確率（Retention）とは異なり、復習に正解して間隔が伸びるたびに上昇します。
 * 最大間隔（MAX_INTERVAL_DAYS）に達すると 100% になります。
 */
const calculateResistanceScore = (intervalDays: number): number => {
  const I = Math.max(0, intervalDays);

  // 対数スケールでスコア化
  // I=1 -> log(2) / log(91) ≈ 0.301 / 1.959 ≈ 15%
  // I=3 -> log(4) / log(91) ≈ 0.602 / 1.959 ≈ 30%
  // I=7 -> log(8) / log(91) ≈ 0.903 / 1.959 ≈ 46%
  // I=30 -> log(31) / log(91) ≈ 1.491 / 1.959 ≈ 76%
  // I=90 -> log(91) / log(91) = 100%

  const numerator = Math.log10(1 + I);
  const denominator = Math.log10(1 + MAX_INTERVAL_DAYS);

  const score = (numerator / denominator) * 100;

  return Math.min(100, Math.round(score));
};



export { calculateRetentionProbability, calculateResistanceScore };
