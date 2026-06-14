"use client";

import { memo } from "react";
import { useAIChatEditor } from "@platejs/ai/react";
import { usePlateEditor } from "platejs/react";
import { EditorStatic } from "./editor-static";
import { BaseEditorKit } from "@/components/editor/editor-base-kit";

type AIChatEditorProps = {
  content: string;
};

const AIChatEditor = memo(({ content }: AIChatEditorProps) => {
  const aiEditor = usePlateEditor({
    plugins: BaseEditorKit,
  });
  const value = useAIChatEditor(aiEditor, content);
  return <EditorStatic variant="aiChat" editor={aiEditor} value={value} />;
});
AIChatEditor.displayName = "AIChatEditor";

export { AIChatEditor };
export type { AIChatEditorProps };
