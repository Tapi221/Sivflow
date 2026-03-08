import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[] = []) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // 入力フィールドでは無効化
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl
          ? event.ctrlKey || event.metaKey
          : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// グローバルショートカット用のプリセット
export function useGlobalShortcuts() {
  const navigate = useNavigate();

  const shortcuts: ShortcutConfig[] = [
    {
      key: "h",
      action: () => navigate("/"),
      description: "ホームに移動",
    },
    {
      key: "c",
      action: () => navigate("/calendar"),
      description: "カレンダーに移動",
    },
    {
      key: "s",
      action: () => navigate("/stats"),
      description: "統計に移動",
    },
    {
      key: ",",
      action: () => navigate("/settings"),
      description: "設定に移動",
    },
    {
      key: "t",
      action: () => navigate("/training"),
      description: "訓練モードに移動",
    },
    {
      key: "?",
      shift: true,
      action: () => {
        // ヘルプモーダルを表示（将来的に実装）
        console.log("キーボードショートカットヘルプ");
      },
      description: "ヘルプを表示",
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}

// 学習モード用ショートカット
export function useStudyShortcuts(config: {
  onCorrect?: () => void;
  onIncorrect?: () => void;
  onSkip?: () => void;
  onShowAnswer?: () => void;
}) {
  const shortcuts: ShortcutConfig[] = [];

  if (config.onCorrect) {
    shortcuts.push({
      key: "1",
      action: config.onCorrect,
      description: "正解",
    });
    shortcuts.push({
      key: "o",
      action: config.onCorrect,
      description: "正解（O）",
    });
  }

  if (config.onIncorrect) {
    shortcuts.push({
      key: "2",
      action: config.onIncorrect,
      description: "不正解",
    });
    shortcuts.push({
      key: "x",
      action: config.onIncorrect,
      description: "不正解（X）",
    });
  }

  if (config.onSkip) {
    shortcuts.push({
      key: "3",
      action: config.onSkip,
      description: "スキップ",
    });
    shortcuts.push({
      key: "s",
      action: config.onSkip,
      description: "スキップ（S）",
    });
  }

  if (config.onShowAnswer) {
    shortcuts.push({
      key: " ",
      action: config.onShowAnswer,
      description: "回答を表示",
    });
    shortcuts.push({
      key: "Enter",
      action: config.onShowAnswer,
      description: "回答を表示",
    });
  }

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}



