import type { ChangeEvent, RefObject } from "react";

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
      <div className="w-full max-w-2xl rounded-[10px] border border-[#e5e7eb] bg-[#FFFFFF] p-8">
        <div className="inline-flex rounded-[999px] bg-[#f3f4f6] px-3 py-1 text-[12px] font-semibold text-[#4b5563]">
          PDF ライブラリ
        </div>
        <h2 className="mt-5 text-[30px] font-semibold tracking-[-0.03em] text-[#20262a]">
          PDF がまだありません
        </h2>
        <p className="mt-3 max-w-xl text-[14px] leading-7 text-[#6f7b78]">
          PDF を取り込むと、この画面で概要カードと一覧テーブルをまとめて管理できます。
        </p>
        <button
          type="button"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-[16px] border border-[#d1d5db] bg-[#FFFFFF] px-5 text-[14px] font-semibold text-[#111827] hover:bg-[#f9fafb]"
          onClick={onImportClick}
        >
          PDF をインポート
        </button>
      </div>
    </div>
  );
};
