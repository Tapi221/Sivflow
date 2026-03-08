import React from "react";
import { SearchX } from "@/ui/icons";

export function ExplorerNoResultsState() {
  return (
    <div className="flex min-h-full items-start justify-center px-4 py-10">
      <div className="text-center text-slate-500">
        <SearchX className="mx-auto mb-3 h-8 w-8 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">一致する項目がありません</p>
        <p className="mt-1 text-xs text-slate-400">
          条件を変えるか、絞り込みをクリアしてください。
        </p>
      </div>
    </div>
  );
}
