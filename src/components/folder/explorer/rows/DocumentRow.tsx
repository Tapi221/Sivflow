import React from "react";
import { cn } from "@web-renderer/lib/utils";
import { ExplorerChromePdfIcon } from "@/components/explorer/icons";
import { buildRenameDeleteMenuActions } from "@/components/folder/components/menus/explorerMenuActionBuilders";
import { beginInlineRename } from "@/components/folder/components/menus/explorerMenuStateHelpers";
import { EXPLORER_ROW_CONTENT_CLASS, EXPLORER_ROW_ICON_SLOT_CLASS, EXPLORER_ROW_INPUT_CLASS, EXPLORER_ROW_LEADING_SLOT_CLASS, EXPLORER_ROW_TITLE_SLOT_CLASS, FOLDER_ROW_ICON_SIZE_CLASS, FOLDER_ROW_TITLE_CLASS } from "./shared";
import { SidebarEntityRow } from "./SidebarEntityRow";



type ExplorerItemType = "folder" | "cardSet" | "card" | "document";
interface RenameTarget {
  id: string; type: ExplorerItemType; }
type TreeNode = {
  rawId: string;
  name: string;
};
interface DocumentRowProps {
  treeNode: TreeNode & { kind: "document"; }; style: React.CSSProperties; depth: number; isSelected: boolean; editingId: string | null; editingName: string; renameCancelledRef: React.MutableRefObject<boolean>; editInputRef: React.MutableRefObject<HTMLInputElement | null>; setEditingId: React.Dispatch<React.SetStateAction<string | null>>; setEditingName: React.Dispatch<React.SetStateAction<string>>; openRowMenuId: string | null; setOpenRowMenuId: React.Dispatch<React.SetStateAction<string | null>>; onItemSelect: (item: { type: "card" | "cardSet" | "document"; id: string; }) => void; canRename: boolean; canDelete: boolean; handleDelete: (id: string, type: ExplorerItemType) => void; handleRenameConfirm: (target?: RenameTarget) => Promise<void>; setRowRef: (id: string, node: HTMLElement | null) => void; }



const DocumentRow = ({ treeNode, style, depth, isSelected, editingId, editingName, renameCancelledRef, editInputRef, setEditingId, setEditingName, openRowMenuId, setOpenRowMenuId, onItemSelect, canRename, canDelete, handleDelete, handleRenameConfirm, setRowRef }: DocumentRowProps) => {
  const rowMenuId = `document:${treeNode.rawId}`;
  const isRowMenuOpen = openRowMenuId === rowMenuId;
  const isEditing = editingId === treeNode.rawId;
  const rowMenuActions = React.useMemo(() => buildRenameDeleteMenuActions({ onRename: canRename ? () => {
    onItemSelect({ type: "document", id: treeNode.rawId }); beginInlineRename({ id: treeNode.rawId, name: treeNode.name, closeMenu: () => {
      setOpenRowMenuId(null); }, setEditingId, setEditingName }); } : undefined, onDelete: canDelete ? () => {
    handleDelete(treeNode.rawId, "document"); } : undefined }), [canDelete, canRename, handleDelete, onItemSelect, setEditingId, setEditingName, setOpenRowMenuId, treeNode.name, treeNode.rawId]);
  const attachEditInputRef = React.useCallback((node: HTMLInputElement | null) => {
    editInputRef.current = node; if (!node || !isEditing) return; node.focus({ preventScroll: true }); node.select(); try {
      node.setSelectionRange(0, node.value.length); } catch {
      return; } }, [editInputRef, isEditing]);
  return (
    <SidebarEntityRow
      containerStyle={style}
      menuOpen={isRowMenuOpen}
      onMenuOpenChange={(open) => {
        setOpenRowMenuId(open ? rowMenuId : null); }}
      menuActions={rowMenuActions}
      hasContextMenu={rowMenuActions.length > 0}
      isEditing={isEditing}
      onContextMenuSelect={() => {
        onItemSelect({ type: "document", id: treeNode.rawId }); }}
      rowRef={(el) => setRowRef(treeNode.rawId, el)}
      depth={depth}
      selected={isSelected}
      contentClassName={EXPLORER_ROW_CONTENT_CLASS}
      leading={null}
      leadingClassName={EXPLORER_ROW_LEADING_SLOT_CLASS}
      iconClassName={EXPLORER_ROW_ICON_SLOT_CLASS}
      titleSlotClassName={EXPLORER_ROW_TITLE_SLOT_CLASS}
      title={treeNode.name}
      titleClassName={cn("lining-nums tabular-nums", FOLDER_ROW_TITLE_CLASS, isSelected ? "font-medium" : "font-normal")}
      icon={<ExplorerChromePdfIcon className={cn(FOLDER_ROW_ICON_SIZE_CLASS)} />}
      input={<input ref={attachEditInputRef} aria-label="文書名の編集" className={EXPLORER_ROW_INPUT_CLASS} defaultValue={editingName} onFocus={(e) => {
        e.currentTarget.select(); }} onMouseUp={(e) => {
        e.preventDefault(); }} onChange={(e) => {
        setEditingName(e.target.value); }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => {
        const isComposing = e.nativeEvent.isComposing || e.keyCode === 229; if (e.key === "Enter" && isComposing) return; if (e.key === "Enter") {
          e.preventDefault(); setEditingName(e.currentTarget.value); e.currentTarget.blur(); } if (e.key === "Escape") {
          e.preventDefault(); e.stopPropagation(); renameCancelledRef.current = true; e.currentTarget.blur(); } }} onBlur={(e) => {
        setEditingName(e.currentTarget.value); void handleRenameConfirm({ id: treeNode.rawId, type: "document" }); }}
      />}
      onClick={(event) => {
        if (event.defaultPrevented) return; onItemSelect({ type: "document", id: treeNode.rawId }); }}
    />
  );
};



export { DocumentRow };
