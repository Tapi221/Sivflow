"use client";

import { Editor, EditorContainer } from "@web-renderer/chip/ui/plate/editor";
import type { Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import { EditorKit } from "@/components/editor/editor-kit";

type PlateEditorProps = {
  initialValue: Value;
  onChange: (change: unknown) => void;
};

const PlateEditor = ({ initialValue, onChange }: PlateEditorProps) => {
  const editor = usePlateEditor({
    plugins: EditorKit,
    value: initialValue,
  }, [initialValue]);
  return (
    <Plate editor={editor} onValueChange={onChange}>
      <EditorContainer>
        <Editor variant="demo" />
      </EditorContainer>
    </Plate>
  );
};

export { PlateEditor };
