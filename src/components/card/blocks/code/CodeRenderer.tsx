import { CodeBlockContent } from "./CodeBlockContent";



interface CodeRendererProps {
  code: string;
  language?: string;
  className?: string;
  zoom?: number;
}



const CodeRenderer = ({ code, language, className, zoom }: CodeRendererProps) => {
  return (<CodeBlockContent mode="viewer" code={code} language={language} className={className} zoom={zoom} />);
};



export { CodeRenderer };
