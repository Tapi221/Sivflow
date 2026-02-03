import React, { useMemo } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { cn } from '@/lib/utils';
import { Check, ClipboardCopy } from 'lucide-react';
import { Button } from '@/Components/ui/button';

interface CodeRendererProps {
  code: string;
  language: string;
  className?: string;
}

export function CodeRenderer({ code, language, className }: CodeRendererProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Ensure language is supported or fallback to 'javascript' or 'clike'
  const validLanguage = language || 'javascript';

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col", className)}>
      {/* Toolbar - Editorとデザインを統一 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
            {/* アイコンはCodeBlockEditorにはないが、Read-onlyを示すためにあってもいいかもしれないが、統一感を優先してEditorに合わせる */}
            {/* Editor: <Code className="w-4 h-4" /> in a slate-100 box */}
             <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {validLanguage}
                </span>
            </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-8 w-8 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
            title="コードをコピー"
          >
            {copied ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="relative flex-1 bg-white overflow-hidden group">
        <Highlight
            theme={themes.vsLight}
            code={code}
            language={validLanguage}
        >
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
                className={cn(className, "p-6 text-sm font-mono overflow-x-auto")}
                style={{ 
                    ...style, 
                    backgroundColor: 'transparent',
                    fontFamily: '"Fira Code", "Fira Mono", monospace',
                    fontSize: 14,
                }}
            >
                {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                    {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                    ))}
                </div>
                ))}
            </pre>
            )}
        </Highlight>
      </div>
    </div>
  );
}
