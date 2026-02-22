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
        'codeBlockRoot relative group overflow-hidden max-w-full',
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
            absolute top-0.5 right-0.5 z-20 flex items-center gap-0.5
            opacity-90 group-hover:opacity-100 group-focus-within:opacity-100
            transition-opacity pointer-events-auto
          "
        >
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger
              className="
                codeBlockLang
                h-5 w-[72px] min-w-0 min-h-0
                rounded-full px-2
                bg-white/75
                border border-slate-200/70
                text-[10px] font-bold text-slate-500
                tracking-[0.12em] uppercase
                hover:text-slate-700
                focus:ring-0
              "
            >
              <SelectValue placeholder="Language" />
            </SelectTrigger>

            <SelectContent className="bg-white">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value} className="text-[8px]">
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
          padding={0}
          className="code-editor-no-scroll codeBlockPre font-mono leading-[24px] [&>pre]:m-0 [&>textarea]:m-0"
          style={{
            fontFamily: '"Fira Code", "Fira Mono", monospace',
            fontSize: 13,
            lineHeight: '24px',
            backgroundColor: 'transparent',
            minHeight: '24px',
            margin: 0,
            overflow: 'visible',
          }}
          textareaClassName="focus:outline-none leading-[24px] m-0 p-0"
        />

        {!code && (
          <div className="absolute top-0 left-0 text-slate-300 font-mono text-[13px] leading-[24px] pointer-events-none">
            // Type or paste your code here...
          </div>
        )}
      </div>
    </div>
  );
}
