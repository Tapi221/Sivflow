import React from 'react';
import { Button } from '@/Components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/Components/ui/select"
import type { CodeBlockData } from '@/types/code-block';
import { Check as CheckIcon } from 'lucide-react';
import CodeIcon from 'lucide-react/dist/esm/icons/code';
import EyeIcon from 'lucide-react/dist/esm/icons/eye';
import EyeOffIcon from 'lucide-react/dist/esm/icons/eye-off';
import CopyIcon from 'lucide-react/dist/esm/icons/copy';
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
import 'prismjs/components/prism-markup'; // HTML
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';

// Manually import a light theme CSS or defined styles
import 'prismjs/themes/prism.css'; // Default light theme

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
  const [copied, setCopied] = React.useState(false);
  
  // Default state
  const code = value?.code || '';
  const language = value?.language || 'javascript';

  const handleCodeChange = (newCode: string) => {
    onChange({
      language,
      code: newCode
    });
  };

  const handleLanguageChange = (newLang: string) => {
    onChange({
      language: newLang,
      code
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightCode = (code: string) => {
    const grammer = Prism.languages[language] || Prism.languages.javascript;
    return Prism.highlight(code, grammer, language);
  };

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-0.5 border-b border-slate-100 bg-slate-50 shrink-0 h-6">

        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[100px] h-5 bg-transparent border-none text-[9px] font-medium text-slate-500 focus:ring-0 px-0 shadow-none hover:text-slate-700">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value} className="text-[10px]">
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="w-[1px] h-2.5 bg-slate-200 mx-0.5" />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-5 w-5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded transition-colors"
            title="Copy code"
          >
            {copied ? <CheckIcon className="w-3 h-3" /> : <CopyIcon className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* WYSIWYG Editor Area */}
      <div className="relative bg-white cursor-text overflow-hidden group">
        <Editor
          value={code}
          onValueChange={handleCodeChange}
          highlight={highlightCode}
          padding={4}
          className="font-mono text-sm"
          style={{
            fontFamily: '"Fira Code", "Fira Mono", monospace',
            fontSize: 12,
            backgroundColor: 'transparent',
            minHeight: '28px',
          }}
          textareaClassName="focus:outline-none"
        />
        {/* Placeholder-like overlay if empty (optional, but editor handles placeholder poorly natively) */}
        {!code && (
           <div className="absolute top-3 left-3 text-slate-300 font-mono text-sm pointer-events-none">
             // Type or paste your code here...
           </div>
        )}
      </div>
    </div>
  );
}
