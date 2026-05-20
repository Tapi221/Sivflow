import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";

import "@blocknote/react/style.css";

export const BlockNotePlayground = () => {
  const editor = useCreateBlockNote();

  return (
    <div className="h-full w-full">
      <BlockNoteView editor={editor} />
    </div>
  );
};

import "@blocknote/mantine/style.css";
