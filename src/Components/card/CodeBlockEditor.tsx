// src/Components/card/CodeBlockEditor.tsx

import { useCallback, useLayoutEffect, useMemo, useState, useRef } from 'react';
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
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import { CodeBlockFrame } from './blocks/CodeBlockFrame';

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
  { value: 'markup', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash' },
  { value: 'markdown', label: 'Markdown' },
];
const SUPPORTED_LANGUAGE_SET = new Set(SUPPORTED_LANGUAGES.map((l) => l.value));

function normalizeLanguage(lang: string): string {
  if (lang === 'html') return 'markup';
  return lang;
}

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && 'localStorage' in window && !!window.localStorage;
  } catch {
    return false;
  }
}

// ─── localStorage ユーティリティ ────────────────────────

/** 最近使った言語リストを取得 */
function getRecentLangs(): string[] {
  if (!canUseLocalStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is string => typeof v === 'string')
      .map(normalizeLanguage)
      .filter((v) => SUPPORTED_LANGUAGE_SET.has(v));
  } catch {
    return [];
  }
}

/**
 * 使った言語を先頭に追加して保存する。
 * リストは最大 MAX_RECENT 件に絞る。
 */
function pushRecentLang(lang: string): void {
  if (!canUseLocalStorage()) return;
  try {
    const normalized = normalizeLanguage(lang);
    const prev = getRecentLangs().filter((l) => l !== normalized); // 重複を除去
    const next = [normalized, ...prev].slice(0, MAX_RECENT);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
  const editorHostRef = useRef<HTMLDivElement | null>(null);

  // 最近使った言語リストを state で管理（セレクトを開いたタイミングで最新を反映）
  const [recentLangs, setRecentLangs] = useState<string[]>(() => getRecentLangs());

  const code = value?.code ?? '';
  const normalizedLanguage = normalizeLanguage(value?.language ?? 'javascript');
  const grammar = useMemo(
    () => Prism.languages[normalizedLanguage] ?? Prism.languages.javascript,
    [normalizedLanguage]
  );

  const handleCodeChange = useCallback((newCode: string) => {
    onChange({ language: normalizedLanguage, code: newCode });
  }, [onChange, normalizedLanguage]);

  const handleLanguageChange = useCallback((newLang: string) => {
    const nextLanguage = normalizeLanguage(newLang);
    onChange({ language: nextLanguage, code });
    // 選択と同時に履歴を更新
    pushRecentLang(nextLanguage);
    setRecentLangs(getRecentLangs());
  }, [onChange, code]);

  const highlightCode = useCallback((src: string) => {
    // Prism.highlight の language 引数は常に正規化済みキーを使う。
    return Prism.highlight(src, grammar, normalizedLanguage);
  }, [grammar, normalizedLanguage]);

  useLayoutEffect(() => {
    const textarea = editorHostRef.current?.querySelector('textarea');
    if (!textarea) return;
    textarea.setAttribute('wrap', 'off');
  }, [normalizedLanguage]);

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

  // 言語セレクタ（右上アクション）
  const languageSelector = (
    <Select
      value={normalizedLanguage}
      onValueChange={handleLanguageChange}
      onOpenChange={(open) => {
        if (open) setRecentLangs(getRecentLangs());
      }}
    >
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
  );

  return (
    <div
      ref={editorHostRef}
      className={className}
    >
      <CodeBlockFrame
        right={languageSelector}
      >
        <Editor
          value={code}
          onValueChange={handleCodeChange}
          highlight={highlightCode}
          padding={{ top: 28, bottom: 10, left: 10, right: 10 }}
          style={{
            fontFamily: '"Fira Code", "Fira Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 14,
            lineHeight: '20px',
            minHeight: 56,
          }}
          className="code-editor-no-scroll w-full"
          textareaClassName="focus:outline-none"
        />
      </CodeBlockFrame>
    </div>
  );
}
