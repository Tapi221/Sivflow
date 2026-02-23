// src/Components/card/CodeBlockEditor.tsx

import React, { useMemo } from 'react';
import { Button } from '@/Components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import type { CodeBlockData } from '@/types/code-block';
import { Check as CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';

import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';

import 'prismjs/themes/prism.css';

// ─── 定数 ────────────────────────────────────────────────

const STORAGE_KEY = 'codeblock_recent_langs';
const MAX_RECENT = 3; // 先頭に表示する最近使った言語の最大数

const SUPPORTED_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash' },
  { value: 'markdown', label: 'Markdown' },
];

// ─── localStorage ユーティリティ ────────────────────────

/** 最近使った言語リストを取得 */
function getRecentLangs(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 使った言語を先頭に追加して保存する。
 * リストは最大 MAX_RECENT 件に絞る。
 */
function pushRecentLang(lang: string): void {
  try {
    const prev = getRecentLangs().filter((l) => l !== lang); // 重複を除去
    const next = [lang, ...prev].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage が使えない環境(プライベートブラウジング等)では無視
  }
}

// ─── コンポーネント ──────────────────────────────────────

interface CodeBlockEditorProps {
  value?: CodeBlockData;
  onChange: (value: CodeBlockData) => void;
  className?: string;
}

export function CodeBlockEditor({ value, onChange, className }: CodeBlockEditorProps) {
  const editorHostRef = React.useRef<HTMLDivElement | null>(null);

  // 最近使った言語リストを state で管理（セレクトを開いたタイミングで最新を反映）
  const [recentLangs, setRecentLangs] = React.useState<string[]>(() => getRecentLangs());

  const code = value?.code ?? '';
  const language = value?.language ?? 'javascript';

  const handleCodeChange = (newCode: string) => {
    onChange({ language, code: newCode });
  };

  const handleLanguageChange = (newLang: string) => {
    onChange({ language: newLang, code });
    // 選択と同時に履歴を更新
    pushRecentLang(newLang);
    setRecentLangs(getRecentLangs());
  };

  const highlightCode = (src: string) => {
    const grammar = (Prism.languages as any)[language] || Prism.languages.javascript;
    return Prism.highlight(src, grammar, language);
  };

  React.useEffect(() => {
    const textarea = editorHostRef.current?.querySelector('textarea');
    if (!textarea) return;
    textarea.setAttribute('wrap', 'off');
  }, [language]);

  // 「最近使った言語」に対応する label オブジェクトを導出
  const recentLangItems = useMemo(() => {
    return recentLangs
      .map((val) => SUPPORTED_LANGUAGES.find((l) => l.value === val))
      .filter((l): l is { value: string; label: string } => l !== undefined);
  }, [recentLangs]);

  // 全言語リストから「最近使った言語」を除いたもの（重複表示を防ぐ）
  const remainingLangItems = useMemo(() => {
    const recentSet = new Set(recentLangs);
    return SUPPORTED_LANGUAGES.filter((l) => !recentSet.has(l.value));
  }, [recentLangs]);

  return (
    <div
      ref={editorHostRef}
      className={cn(
        'codeBlockRoot relative group overflow-hidden max-w-full rounded-xl border border-zinc-200/50 bg-zinc-50/70 shadow-sm',
        className
      )}
    >
      <div
        className={cn(
          "relative cursor-text overflow-hidden leading-[24px] max-w-full w-full",
          "code-editor-surface"
        )}
      >
        {/* ── 言語セレクタ ── */}
        <div
          className="
            absolute top-2.5 left-[10px] z-30 flex items-center gap-0.5
            opacity-40 group-hover:opacity-100 group-focus-within:opacity-100
            transition-opacity pointer-events-auto
          "
        >
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger
              className="
                h-5 w-auto min-w-0 min-h-0
                rounded-md px-1.5 py-0
                bg-zinc-900/5 border-none shadow-none
                text-[10px] font-bold text-zinc-500
                tracking-wider uppercase
                hover:text-zinc-700 hover:bg-zinc-900/10
                focus:ring-0
                gap-1
              "
            >
              <SelectValue placeholder="Language" />
            </SelectTrigger>

            <SelectContent className="bg-white">
              {/* 最近使った言語セクション（1件以上あるときだけ表示） */}
              {recentLangItems.length > 0 && (
                <>
                  <SelectGroup>
                    <SelectLabel className="text-[10px] text-slate-400 uppercase tracking-widest px-2 py-1">
                      最近使った言語
                    </SelectLabel>
                    {recentLangItems.map((lang) => (
                      <SelectItem key={`recent-${lang.value}`} value={lang.value} className="text-xs">
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectSeparator />
                </>
              )}

              {/* 残りの全言語 */}
              <SelectGroup>
                {recentLangItems.length > 0 && (
                  <SelectLabel className="text-[10px] text-slate-400 uppercase tracking-widest px-2 py-1">
                    すべての言語
                  </SelectLabel>
                )}
                {remainingLangItems.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value} className="text-xs">
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* ── コードエディタ本体（既存のまま） ── */}
        <Editor
          value={code}
          onValueChange={handleCodeChange}
          highlight={highlightCode}
          padding={{ top: 28, bottom: 10, left: 10, right: 10 }}
          style={{
            fontFamily: '"Fira Code", "Fira Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 13,
            lineHeight: '24px',
            minHeight: 56,
          }}
          className="code-editor-no-scroll w-full"
          textareaClassName="focus:outline-none"
        />
      </div>
    </div>
  );
}
