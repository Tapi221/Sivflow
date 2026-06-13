"use client";

import type { Value } from "platejs";
import { Plate, usePlateEditor } from "platejs/react";
import { Editor, EditorContainer } from "@/chip/ui/plate/editor";
import { EditorKit } from "@/components/editor/editor-kit";
import { SettingsDialog } from "@/components/editor/settings-dialog";

type PlateEditorProps = {
  initialValue: Value;
  onChange: (change: unknown) => void;
};

const PlateEditor = ({ initialValue, onChange }: PlateEditorProps) => {
  const editor = usePlateEditor({
    plugins: EditorKit,
    value: initialValue,
  });
  return (
    <Plate editor={editor} onChange={onChange}>
      <EditorContainer>
        <Editor placeholder="本文を入力" spellCheck variant="demo" />
      </EditorContainer>
      <SettingsDialog />
    </Plate>
  );
};

export { PlateEditor };
