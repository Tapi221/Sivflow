import React from 'react';
import { Button } from '@/Components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
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

interface CodeBlockEditorProps {
  value?: CodeBlockData;
  onChange: (value: CodeBlockData) => void;
  className?: string;
}

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

export function CodeBlockEditor({ value, onChange, className }: CodeBlockEditorProps) {
  const editorHostRef = React.useRef<HTMLDivElement | null>(null);


  const code = value?.code ?? '';
  const language = value?.language ?? 'javascript';

  const handleCodeChange = (newCode: string) => {
    onChange({ language, code: newCode });
  };

  const handleLanguageChange = (newLang: string) => {
    onChange({ language: newLang, code });
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
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value} className="text-xs">
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Editor
          value={code}
          onValueChange={handleCodeChange}
          highlight={highlightCode}
          padding="24px 10px 10px 10px"
          className={cn(
            "code-editor-no-scroll codeBlockPre font-mono",
            // Prism.css 等の不要なマージン/背景をリセット
            "[&>pre]:!m-0 [&>pre]:!bg-transparent [&>pre]:!border-none",
            "[&>textarea]:!m-0 [&>textarea]:!border-none [&>textarea]:!ring-0 [&>textarea]:!outline-none"
          )}
          style={{
            fontFamily: '"Fira Code", "Fira Mono", ui-monospace, monospace',
            fontSize: 13.5,
            lineHeight: '20px',
            backgroundColor: 'transparent',
            minHeight: '20px',
            margin: 0,
            overflow: 'visible',
          }}
          textareaClassName="leading-[20px] m-0"
        />

        {!code && (
          <div className="absolute top-0 left-0 text-slate-300 font-mono text-[13.5px] items-center leading-[20px] pointer-events-none p-[24px_10px_10px_10px] z-0">
            // Type or paste your code here...
          </div>
        )}
      </div>
    </div>
  );
}
