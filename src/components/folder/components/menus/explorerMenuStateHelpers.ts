import type { MutableRefObject } from "react";

interface BeginInlineRenameParams {
  id: string;
  name: string;
  closeMenu?: () => void;
  setEditingId: (id: string | null) => void;
  setEditingName: (name: string) => void;
  editingNameRef: MutableRefObject<string>;
  beforeStart?: () => void;
}

export const beginInlineRename = ({
  id,
  name,
  closeMenu,
  setEditingId,
  setEditingName,
  editingNameRef,
  beforeStart,
}: BeginInlineRenameParams) => {
  beforeStart?.();
  closeMenu?.();
  setEditingId(id);
  setEditingName(name);
  editingNameRef.current = name;
};
