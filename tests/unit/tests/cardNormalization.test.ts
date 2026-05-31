import { describe, expect, it } from "vitest";
import { LEGACY_BASE_LAYOUT_ROWS, MAX_LAYOUT_ROWS } from "@/domain/card/extraRows";
import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";

describe("normalizeCard", () => {
  it("questionBlocks と answerBlocks から空の数式ブロックを除外する", () => {
    const rawCard = {
      id: "test-card",
      questionBlocks: [
        { id: "q1", type: "text", content: "What is 1+1?" },
        { id: "q2", type: "math", math: { latex: "", displayMode: "block" } },
        {
          id: "q3",
          type: "math",
          math: { latex: "2+2=4", displayMode: "inline" },
        },
      ],
      answerBlocks: [
        { id: "a1", type: "math", math: { latex: " ", displayMode: "block" } },
      ],
    };

    const normalized = normalizeCard(rawCard);

    expect(normalized.questionBlocks).toHaveLength(2);
    expect(normalized.questionBlocks[0].type).toBe("text");
    expect(normalized.questionBlocks[1].math.latex).toBe("2+2=4");

    expect(normalized.answerBlocks).toHaveLength(0);
  });

  it("数式ブロックにデフォルト値を補う", () => {
    const rawCard = {
      id: "test-card",
      questionBlocks: [{ id: "q1", type: "math", math: { latex: "x^2" } }],
    };

    const normalized = normalizeCard(rawCard);
    expect(normalized.questionBlocks[0].math.latex).toBe("x^2");
  });

  it("レガシーフィールドをブロックへ変換する", () => {
    const rawCard = {
      id: "legacy-card",
      question_text: "Legacy Question",
      answer_text: "Legacy Answer",
    };

    const normalized = normalizeCard(rawCard);

    expect(normalized.questionBlocks).toHaveLength(1);
    expect(normalized.questionBlocks[0].type).toBe("text");
    expect(normalized.questionBlocks[0].content).toBe("Legacy Question");

    expect(normalized.answerBlocks).toHaveLength(1);
    expect(normalized.answerBlocks[0].content).toBe("Legacy Answer");
  });

  it("レイアウト行数を正規化する", () => {
    const rawCard = {
      id: "rows-card",
      layout_rows: "20",
      question_extra_rows: "3",
      answerExtraRows: 2,
    };

    const normalized = normalizeCard(rawCard);

    expect(normalized.layoutRows).toBe(20);
  });

  it("レガシーの面別追加行数を大きい側に合わせて layoutRows へ移行する", () => {
    const rawCard = {
      id: "legacy-rows-card",
      question_extra_rows: "3",
      answer_extra_rows: 10,
    };

    const normalized = normalizeCard(rawCard);
    expect(normalized.layoutRows).toBe(LEGACY_BASE_LAYOUT_ROWS + 10);
  });

  it("layoutRows を互換上限で clamp しない", () => {
    const rawCard = {
      id: "clamp-rows-card",
      layoutRows: MAX_LAYOUT_ROWS + 100,
    };

    const normalized = normalizeCard(rawCard);
    expect(normalized.layoutRows).toBe(MAX_LAYOUT_ROWS + 100);
  });

  it("コードブロックの rowOffset を非負 clamp 付きで offsetRows へ移行する", () => {
    const rawCard = {
      id: "offset-migrate-card",
      questionBlocks: [
        {
          id: "q-code-1",
          type: "code",
          rowOffset: 3,
          code: { language: "javascript", code: "const a = 1;" },
        },
        {
          id: "q-code-2",
          type: "code",
          rowOffset: -2,
          code: { language: "javascript", code: "const b = 2;" },
        },
      ],
    };

    const normalized = normalizeCard(rawCard);
    expect(normalized.questionBlocks[0].offsetRows).toBe(3);
    expect(normalized.questionBlocks[0].rowOffset).toBeUndefined();
    expect(normalized.questionBlocks[1].offsetRows).toBe(0);
    expect(normalized.questionBlocks[1].rowOffset).toBeUndefined();
  });

  it("数式ブロックの rowOffset を非負 clamp 付きで offsetRows へ移行する", () => {
    const rawCard = {
      id: "math-offset-migrate-card",
      answerBlocks: [
        {
          id: "a-math-1",
          type: "math",
          rowOffset: 3,
          math: { latex: "x^2", displayMode: "block" },
        },
        {
          id: "a-math-2",
          type: "math",
          rowOffset: -2,
          math: { latex: "x+1", displayMode: "block" },
        },
      ],
    };

    const normalized = normalizeCard(rawCard);
    expect(normalized.answerBlocks[0].offsetRows).toBe(3);
    expect(normalized.answerBlocks[0].rowOffset).toBeUndefined();
    expect(normalized.answerBlocks[1].offsetRows).toBe(0);
    expect(normalized.answerBlocks[1].rowOffset).toBeUndefined();
  });
});
