import type { PdfLibraryRow } from "@/features/library-pdf/model/pdfLibraryRow";

const cardClassName = "rounded-[10px] border border-[#e5e7eb] bg-[#FFFFFF] p-4";

const PdfIconBadge = () => {
  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[999px] border border-[#e5e7eb] bg-[#f7f7f7] text-[#7b8794]"
      aria-hidden="true"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </span>
  );
};

const RefreshIconBadge = () => {
  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[999px] border border-[#e5e7eb] bg-[#f7f7f7] text-[#7b8794]"
      aria-hidden="true"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.75 8.25H3.75V5.25" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17.25 15.75H20.25V18.75" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.38 13.5C5.71 15.06 6.62 16.44 7.95 17.39C9.27 18.34 10.91 18.79 12.53 18.64C14.15 18.48 15.68 17.74 16.83 16.56L17.25 15.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18.62 10.5C18.29 8.94 17.38 7.56 16.05 6.61C14.73 5.66 13.09 5.21 11.47 5.36C9.85 5.52 8.32 6.26 7.17 7.44L6.75 8.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
};

const PdfFileBadge = () => {
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#fff1f2] text-[#e72a2a]" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" clipRule="evenodd" d="M7 3.5C6.60218 3.5 6.22064 3.65804 5.93934 3.93934C5.65804 4.22064 5.5 4.60218 5.5 5V19C5.5 19.3978 5.65804 19.7794 5.93934 20.0607C6.22064 20.342 6.60218 20.5 7 20.5H17C17.3978 20.5 17.7794 20.342 18.0607 20.0607C18.342 19.7794 18.5 19.3978 18.5 19V9.41411C18.4999 9.28155 18.4473 9.15433 18.3535 9.06061L12.9394 3.64655C12.8457 3.5528 12.7186 3.50006 12.586 3.5H7ZM5.23223 3.23223C5.70107 2.76339 6.33696 2.5 7 2.5H12.586C12.9838 2.50008 13.3653 2.65816 13.6466 2.93945L19.0605 8.35339C19.3418 8.63463 19.4999 9.01613 19.5 9.41389V19C19.5 19.663 19.2366 20.2989 18.7678 20.7678C18.2989 21.2366 17.663 21.5 17 21.5H7C6.33696 21.5 5.70107 21.2366 5.23223 20.7678C4.76339 20.2989 4.5 19.663 4.5 19V5C4.5 4.33696 4.76339 3.70107 5.23223 3.23223Z" fill="currentColor" />
        <path d="M8.2 15.1V11.7H9.46C9.98 11.7 10.39 11.84 10.68 12.12C10.96 12.39 11.1 12.76 11.1 13.22C11.1 13.68 10.96 14.05 10.68 14.33C10.39 14.6 9.98 14.74 9.46 14.74H8.95V15.1H8.2ZM8.95 14.11H9.41C9.64 14.11 9.81 14.03 9.94 13.89C10.07 13.76 10.13 13.54 10.13 13.22C10.13 12.9 10.07 12.68 9.94 12.54C9.81 12.4 9.64 12.33 9.41 12.33H8.95V14.11ZM11.66 15.1V11.7H12.89C13.43 11.7 13.86 11.85 14.18 12.15C14.5 12.45 14.66 12.87 14.66 13.4C14.66 13.93 14.5 14.35 14.18 14.65C13.86 14.95 13.43 15.1 12.89 15.1H11.66ZM12.41 14.47H12.82C13.18 14.47 13.46 14.38 13.64 14.2C13.82 14.02 13.91 13.75 13.91 13.4C13.91 13.05 13.82 12.78 13.64 12.6C13.46 12.42 13.18 12.33 12.82 12.33H12.41V14.47ZM15.3 15.1V11.7H17.52V12.34H16.05V13.08H17.37V13.71H16.05V15.1H15.3Z" fill="currentColor" />
      </svg>
    </span>
  );
};

const ContinueEmptyState = () => {
  return (
    <div className="rounded-[10px] border border-[#e5e7eb] bg-[#fafafa] px-4 py-8 text-[14px] text-[#9aa5b1]">
      閲覧途中の PDF はまだありません。
    </div>
  );
};

const RecentList = ({
  rows,
  onOpenDocument,
}: {
  rows: PdfLibraryRow[];
  onOpenDocument: (documentId: string) => void;
}) => {
  if (rows.length === 0) {
    return (
      <div className="rounded-[10px] border border-[#e5e7eb] bg-[#fafafa] px-4 py-8 text-[14px] text-[#9aa5b1]">
        最近更新された PDF はまだありません。
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          className="flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left transition-colors hover:bg-[#fafafa]"
          onClick={() => onOpenDocument(row.id)}
        >
          <PdfFileBadge />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[16px] font-semibold text-[#20262a]">
              {row.fileName}
            </div>
            <div className="mt-1 truncate text-[12px] text-[#8b96a5]">
              {row.folderPathLabel}
            </div>
          </div>
          <span className="shrink-0 rounded-[999px] bg-[#f3f4f6] px-3 py-1 text-[12px] font-semibold text-[#7b8794]">
            更新
          </span>
        </button>
      ))}
    </div>
  );
};

export const PdfLibrarySummaryCards = ({
  continueRows,
  recentRows,
  onOpenDocument,
}: {
  continueRows: PdfLibraryRow[];
  recentRows: PdfLibraryRow[];
  onOpenDocument: (documentId: string) => void;
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className={cardClassName}>
        <div className="flex items-start gap-3">
          <PdfIconBadge />
          <div>
            <h2 className="text-[20px] font-semibold text-[#20262a]">続きを読む</h2>
            <p className="mt-1 text-[14px] leading-8 text-[#7b8794]">
              閲覧途中の PDF を、前回の位置からすぐ再開します。
            </p>
          </div>
        </div>
        <div className="mt-4">
          {continueRows.length === 0 ? (
            <ContinueEmptyState />
          ) : (
            <RecentList rows={continueRows} onOpenDocument={onOpenDocument} />
          )}
        </div>
      </section>

      <section className={cardClassName}>
        <div className="flex items-start gap-3">
          <RefreshIconBadge />
          <div>
            <h2 className="text-[20px] font-semibold text-[#20262a]">最近更新</h2>
            <p className="mt-1 text-[14px] leading-8 text-[#7b8794]">
              直近で追加または更新された PDF を一覧で確認できます。
            </p>
          </div>
        </div>
        <div className="mt-4">
          <RecentList rows={recentRows} onOpenDocument={onOpenDocument} />
        </div>
      </section>
    </div>
  );
};
