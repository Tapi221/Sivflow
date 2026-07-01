interface BeginInlineRenameParams {
  id: string;
  name: string;
  closeMenu?: () => void;
  setEditingId: (id: string | null) => void;
  setEditingName: (name: string) => void;
  beforeStart?: () => void;
}



const beginInlineRename = ({ id, name, closeMenu, setEditingId, setEditingName, beforeStart }: BeginInlineRenameParams) => {
  beforeStart?.();
  closeMenu?.();
  setEditingId(id);
  setEditingName(name);
};



export { beginInlineRename };
