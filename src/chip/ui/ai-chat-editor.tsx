"use client";

import * as React from "react";
import { useAIChatEditor } from "@platejs/ai/react";
import { usePlateEditor } from "platejs/react";
import { BaseEditorKit } from "@/components/editor/editor-base-kit";
import { EditorStatic } from "./editor-static";

const AIChatEditor = React.memo(({ content }: { content: string;
}) => {
  const aiEditor = usePlateEditor({
    plugins: BaseEditorKit,
  });

  const value = useAIChatEditor(aiEditor, content);

  return <EditorStatic variant="aiChat" editor={aiEditor} value={value} />;
});

export { AIChatEditor };
