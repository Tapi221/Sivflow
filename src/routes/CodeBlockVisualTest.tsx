import { useState } from "react";
import { CodeBlockEditor } from "@/components/card/blocks/code/CodeBlockEditor";
import { CodeRenderer } from "@/components/card/blocks/code/CodeRenderer";
import type { CodeBlockData } from "@/types/core/code-block";



const SAMPLE_CODE = `function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const values = Array.from({ length: 12 }, (_, i) => fibonacci(i));
console.log(values.join(", "));
`;



const CodeBlockVisualTest = () => {
  const [editorValue, setEditorValue] = useState<CodeBlockData>({
    language: "typescript",
    code: SAMPLE_CODE,
  });

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto flex w-full max-w-96 flex-col gap-8">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="mb-4 text-sm font-bold tracking-wide text-slate-600">
            Code Block Viewer
          </h1>
          <div data-testid="codeblock-viewer-shot">
            <CodeRenderer code={SAMPLE_CODE} language="typescript" />
          </div>
        </section>
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold tracking-wide text-slate-600">
            Code Block Editor
          </h2>
          <div data-testid="codeblock-editor-shot">
            <CodeBlockEditor value={editorValue} onChange={setEditorValue} />
          </div>
        </section>
      </div>
    </main>
  );
};



export default CodeBlockVisualTest;
