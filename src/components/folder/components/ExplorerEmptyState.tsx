import React from "react";
import { Folder as FolderIcon } from "@/ui/icons";

export function ExplorerEmptyState() {
  return (
    <div className="text-center py-8 text-slate-400">
      <FolderIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-xs">フォルダとカードがありません</p>
    </div>
  );
}
