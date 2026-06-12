"use client";

import type { Value } from "platejs";

import { Plate, usePlateEditor } from "platejs/react";

import { Editor, EditorContainer } from "@/components/ui/editor";

import { EditorKit } from "./editor-kit";

import { SettingsDialog } from "./settings-dialog";



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
    <Plate editor={editor} onChange={onChange} primary>
      <EditorContainer>
        <Editor placeholder="本文を入力" spellCheck />
      </EditorContainer>
      <SettingsDialog />
    </Plate>
  );
};



export { PlateEditor };
