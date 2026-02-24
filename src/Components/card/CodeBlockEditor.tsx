
import React, { useMemo } from 'react';
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
const MAX_RECENT = 3;

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



const LANGUAGE_LABELS: Record<string, string> = {
  javascript: 'JS',
  typescript: 'TS',
  python: 'PY',
  java: 'JAVA',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  go: 'GO',
  rust: 'RS',
  sql: 'SQL',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  bash: 'SH',
  markdown: 'MD',
};

// ─── localStorage ユーティリティ ────────────────────────

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

function pushRecentLang(lang: string): void {
  try {
    const prev = getRecentLangs().filter((l) => l !== lang);
    const next = [lang, ...prev].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage が使えない環境では無視
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

  const [recentLangs, setRecentLangs] = React.useState<string[]>(() => getRecentLangs());

  const code = value?.code ?? '';
  const language = value?.language ?? 'javascript';

  const languageLabel = useMemo(() => {
    return LANGUAGE_LABELS[language] ?? language.toUpperCase();
  }, [language]);

  const handleCodeChange = (newCode: string) => {
    onChange({ language, code: newCode });
  };

  const handleLanguageChange = (newLang: string) => {
    onChange({ language: newLang, code });
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

  const recentLangItems = useMemo(() => {
    return recentLangs
      .map((val) => SUPPORTED_LANGUAGES.find((l) => l.value === val))
      .filter((l): l is { value: string; label: string } => l !== undefined);
  }, [recentLangs]);

  const remainingLangItems = useMemo(() => {
    const recentSet = new Set(recentLangs);
    return SUPPORTED_LANGUAGES.filter((l) => !recentSet.has(l.value));
  }, [recentLangs]);

  const languageSelector = (
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
    <CodeBlockFrame languageLabel={languageLabel} right={languageSelector} className={className}>
      <div ref={editorHostRef} className="w-full">
        <Editor
          value={code}
          onValueChange={handleCodeChange}
          highlight={highlightCode}
          padding={0}
          style={{ minHeight: 56 }}
          className="code-editor-no-scroll w-full"
          textareaClassName="focus:outline-none"
        />
      </div>
    </CodeBlockFrame>
  );
}