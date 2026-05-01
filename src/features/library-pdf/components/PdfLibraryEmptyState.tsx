import type { ChangeEvent, RefObject } from "react";

import { Button } from "@/components/ui/button";

type PdfLibraryEmptyStateProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  currentFileAccept: string;
  onFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImportClick: () => void;
};

export const PdfLibraryEmptyState = ({
  fileInputRef,
  currentFileAccept,
  onFileInputChange,
  onImportClick,
}: PdfLibraryEmptyStateProps) => {
  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center bg-[#FFFFFF] p-8">
      <input
        ref={fileInputRef}
        accept={currentFileAccept}
        className="hidden"
        multiple
        type="file"
        onChange={onFileInputChange}
      />
      <div className="w-full max-w-2xl rounded-[18px] border border-[#e5e7eb] bg-[#FFFFFF] p-8 shadow-[0_12px_48px_rgba(15,23,42,0.06)]">
        <div className="inline-flex rounded-full bg-[#f3f4f6] px-3 py-1 text-[12px] font-semibold text-[#4b5563]">
          PDF ライブラリ
        </div>
        <h2 className="mt-5 text-[30px] font-semibold tracking-[-0.03em] text-[#20262a]">
          PDF がまだありません
        </h2>
        <p className="mt-3 max-w-xl text-[14px] leading-7 text-[#6f7b78]">
          PDF を取り込むと、この画面で概要カードと一覧テーブルをまとめて管理できます。
        </p>
        <Button
          className="mt-8 h-11 rounded-2xl px-5 text-[14px] font-semibold"
          type="button"
          onClick={onImportClick}
        >
          PDF をインポート
        </Button>
      </div>
    </div>
  );
};
