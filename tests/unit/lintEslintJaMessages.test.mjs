import { describe, expect, it } from "vitest";
import { translateLintMessage } from "../../scripts/lint-eslint-ja.mjs";

const ENGLISH_FRAGMENTS = [
  "Run autofix",
  "React Hook",
  "has a missing dependency",
  "has an unnecessary dependency",
  "Unexpected constant nullishness",
  "will likely have changed",
];

describe("lint eslint Japanese messages", () => {
  it("import sort の lint メッセージを日本語化する", () => {
    const message = translateLintMessage("Run autofix to sort these imports!", "simple-import-sort/imports");

    expect(message).toBe("import の並び順が規約と一致していません。npm run lint:fix で自動修正してください。");
    for (const fragment of ENGLISH_FRAGMENTS) {
      expect(message).not.toContain(fragment);
    }
  });

  it("React Hook の不足依存メッセージを依存名付きで日本語化する", () => {
    const message = translateLintMessage("React Hook useCallback has a missing dependency: 'state'. Either include it or remove the dependency array.", "react-hooks/exhaustive-deps");

    expect(message).toBe("React Hook useCallback の依存配列に `state` が不足しています。依存配列へ追加するか、依存配列を削除してください。");
    for (const fragment of ENGLISH_FRAGMENTS) {
      expect(message).not.toContain(fragment);
    }
  });

  it("React Hook の不要依存メッセージを依存名付きで日本語化する", () => {
    const message = translateLintMessage("React Hook useMemo has an unnecessary dependency: 'currentUser.uid'. Either exclude it or remove the dependency array.", "react-hooks/exhaustive-deps");

    expect(message).toBe("React Hook useMemo の依存配列に不要な `currentUser.uid` が含まれています。依存配列から除外するか、依存配列を削除してください。");
    for (const fragment of ENGLISH_FRAGMENTS) {
      expect(message).not.toContain(fragment);
    }
  });

  it("React Hook の ref cleanup メッセージを日本語化する", () => {
    const message = translateLintMessage("The ref value 'pendingNotificationTimersRef.current' will likely have changed by the time this effect cleanup function runs. If this ref points to a node rendered by React, copy 'pendingNotificationTimersRef.current' to a variable inside the effect, and use that variable in the cleanup function.", "react-hooks/exhaustive-deps");

    expect(message).toBe("effect の cleanup 実行時には ref 値 `pendingNotificationTimersRef.current` が変わっている可能性があります。effect 内で変数にコピーし、cleanup ではその変数を使ってください。");
    for (const fragment of ENGLISH_FRAGMENTS) {
      expect(message).not.toContain(fragment);
    }
  });

  it("定数二項式の lint メッセージを日本語化する", () => {
    const message = translateLintMessage("Unexpected constant nullishness on the left-hand side of a `??` expression.", "no-constant-binary-expression");

    expect(message).toBe("`??` の左辺が常に nullish 判定として固定されています。不要な `??` を削除するか、式を見直してください。");
    for (const fragment of ENGLISH_FRAGMENTS) {
      expect(message).not.toContain(fragment);
    }
  });
});
