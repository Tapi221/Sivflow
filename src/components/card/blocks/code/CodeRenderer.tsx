import { CodeBlockContent } from "./CodeBlockContent";

interface CodeRendererProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeRenderer({ code, language, className }: CodeRendererProps) {
  return (
    <CodeBlockContent
      mode="viewer"
      code={code}
      language={language}
      className={className}
    />
  );
}





