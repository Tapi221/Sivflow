import React, { useMemo } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { cn } from '@/lib/utils';
import Check from 'lucide-react/dist/esm/icons/check';
import Copy from 'lucide-react/dist/esm/icons/copy';
import { Button } from '@/Components/ui/button';

interface CodeRendererProps {
  code: string;
  language: string;
  className?: string;
}

export function CodeRenderer({ code, language, className }: CodeRendererProps) {
  const [copied, setCopied] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(true);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Ensure language is supported or fallback to 'javascript' or 'clike'
  const validLanguage = language || 'javascript';

  // Determine if code is "long" (more than 12 lines)
  const lineCount = code.split('\n').length;
  const isLong = lineCount > 12;

  return (
    <div className={cn("rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col", className)}>
      {/* Toolbar - Editorとデザインを統一 */}
      <div className="flex items-center justify-between px-3 py-0.5 border-b border-slate-100 bg-slate-50/50 backdrop-blur-sm shrink-0 h-6">
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {validLanguage}
                </span>
            </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="h-4 w-4 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
            title="コードをコピー"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      <div className={cn(
        "relative flex-1 bg-white overflow-hidden group transition-all duration-500",
        isLong && isCollapsed ? "max-h-[300px]" : "max-h-none"
      )}>
        <Highlight
            theme={themes.vsLight}
            code={code}
            language={validLanguage}
        >
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
                className={cn(className, "p-4 code-block-pre")}
                style={{
                  ...style,
                  backgroundImage: 'linear-gradient(to right, transparent 0%, transparent calc(100% - 1px), #f1f5f9 100%)',
                  backgroundSize: '2ch 100%',
                  backgroundAttachment: 'local'
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

        {/* Fade-out Overlay when collapsed */}
        {isLong && isCollapsed && (
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
        )}
      </div>

      {/* Expand/Collapse Button */}
      {isLong && (
        <div className="flex justify-center p-2 border-t border-slate-50 bg-slate-50/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-[10px] font-bold text-slate-400 hover:text-primary-600 uppercase tracking-widest transition-colors flex items-center gap-2"
          >
            {isCollapsed ? (
              <>
                <span>もっと見る ({lineCount} 行)</span>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
              </>
            ) : (
              <span>閉じる</span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
