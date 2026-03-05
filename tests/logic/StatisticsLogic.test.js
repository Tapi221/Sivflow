import { describe, it, expect } from "vitest";

// モックロジック用の関数 (Statistics.jsx内のロジックをシミュレーション)
function getChartProps(cards) {
  const isEmpty = cards.length === 0;

  // Statistics.jsx で定義されている定数と同じもの
  const DUMMY_BUCKETS = [
    { range: "0-5%", count: 1, min: 0, max: 5 },
    // ... (省略) ...
  ];

  if (isEmpty) {
    return {
      mode: "empty",
      data: DUMMY_BUCKETS, // 実際にはここで定数が渡される
      barOpacity: 0.3,
      enableTooltip: false,
      showReferenceLines: false,
    };
  }

  return {
    mode: "normal",
    data: undefined, // カードから計算されるため undefined
    barOpacity: 1,
    enableTooltip: true,
    showReferenceLines: true,
  };
}

describe("Statistics Page Logic", () => {
  describe("Empty State Logic", () => {
    it("should return empty mode props when cards array is empty", () => {
      const cards = [];
      const props = getChartProps(cards);

      expect(props.mode).toBe("empty");
      expect(props.barOpacity).toBe(0.3);
      expect(props.enableTooltip).toBe(false);
      expect(props.showReferenceLines).toBe(false);
      expect(props.data).toBeDefined(); // ダミーデータがあること
    });
  });

  describe("Normal State Logic", () => {
    it("should return normal mode props when cards exist", () => {
      const cards = [{ id: 1, question: "test" }]; // ダミーカード
      const props = getChartProps(cards);

      expect(props.mode).toBe("normal");
      expect(props.barOpacity).toBe(1);
      expect(props.enableTooltip).toBe(true);
      expect(props.showReferenceLines).toBe(true);
      expect(props.data).toBeUndefined(); // 実データ計算へ委譲
    });
  });
});
