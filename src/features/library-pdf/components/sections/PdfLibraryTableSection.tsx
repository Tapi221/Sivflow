import type { ReactNode } from "react";

type PdfLibraryTableSectionProps = {
  children: ReactNode;
};

export const PdfLibraryTableSection = ({
  children,
}: PdfLibraryTableSectionProps) => {
  return (
    <section className="pdf-library-table-shell min-h-0 flex-1 rounded-[30px] border border-white/70 bg-white/70 p-2 shadow-[0_28px_72px_-44px_rgba(15,23,42,0.58)] backdrop-blur-2xl">
      <style>{`
        .pdf-library-table-shell > div:first-of-type {
          border: 1px solid rgba(255, 255, 255, 0.82);
          border-radius: 24px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 248, 251, 0.84));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            inset 0 -1px 0 rgba(60, 60, 67, 0.08);
          padding: 5px;
        }

        .pdf-library-table-shell > div:first-of-type::-webkit-scrollbar {
          height: 10px;
        }

        .pdf-library-table-shell > div:first-of-type::-webkit-scrollbar-thumb {
          border: 3px solid transparent;
          border-radius: 999px;
          background-clip: content-box;
          background-color: rgba(60, 60, 67, 0.24);
        }

        .pdf-library-table-shell div[style*="grid-template-columns"]:not([role="button"]) {
          height: 34px;
          border: 0;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.72);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.88);
          color: rgba(60, 60, 67, 0.58);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
          padding: 0 10px;
        }

        .pdf-library-table-shell div[style*="grid-template-columns"]:not([role="button"]) button {
          color: inherit;
          font-weight: 700;
        }

        .pdf-library-table-shell div[style*="grid-template-columns"]:not([role="button"]) button[style*="color"] {
          color: #007aff !important;
        }

        .pdf-library-table-shell div[style*="grid-template-columns"]:not([role="button"]) [role="separator"] > div {
          height: 16px;
          border-radius: 999px;
          background: rgba(60, 60, 67, 0.16);
        }

        .pdf-library-table-shell .absolute[style*="background-color"] {
          background-color: rgba(0, 122, 255, 0.06) !important;
        }

        .pdf-library-table-shell .absolute.h-\[3px\][style*="background-color"] {
          border-radius: 999px;
          background-color: #007aff !important;
        }

        .pdf-library-table-shell div[role="button"][style*="grid-template-columns"] {
          height: 34px;
          margin-top: 2px;
          border-top: 0 !important;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.58) !important;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.42);
          padding: 0 10px;
          transform: none;
          transition: none;
        }

        .pdf-library-table-shell div[role="button"][style*="grid-template-columns"]:hover {
          background: rgba(255, 255, 255, 0.58) !important;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.42);
          transform: none;
        }

        .pdf-library-table-shell div[role="button"][style*="grid-template-columns"].bg-\[\#f9fafb\] {
          background: rgba(0, 122, 255, 0.10) !important;
          box-shadow: inset 0 0 0 1px rgba(0, 122, 255, 0.14);
        }

        .pdf-library-table-shell div[role="button"][style*="grid-template-columns"].bg-\[\#f9fafb\]:hover {
          background: rgba(0, 122, 255, 0.10) !important;
          box-shadow: inset 0 0 0 1px rgba(0, 122, 255, 0.14);
        }

        .pdf-library-table-shell div[role="button"] span.text-\[\#273038\] {
          color: #1c1c1e;
          font-weight: 600;
        }

        .pdf-library-table-shell div[role="button"] div.text-\[\#8f929c\] {
          color: rgba(60, 60, 67, 0.62);
        }

        .pdf-library-table-shell div[role="button"] button[aria-label$="を開く"] {
          border-radius: 999px;
          background: transparent;
          color: rgba(60, 60, 67, 0.58);
        }

        .pdf-library-table-shell div[role="button"] button[aria-label$="を開く"]:hover {
          background: transparent;
          color: rgba(60, 60, 67, 0.58);
        }

        .pdf-library-table-shell > div:last-of-type {
          margin-top: 8px;
          border: 0;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.62);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86);
          padding: 8px 10px;
        }

        .pdf-library-table-shell > div:last-of-type button {
          height: 32px;
          width: 32px;
          border: 0;
          border-radius: 999px;
          background: rgba(120, 120, 128, 0.12);
          color: rgba(60, 60, 67, 0.64);
          font-size: 18px;
        }

        .pdf-library-table-shell > div:last-of-type button:not(:disabled):hover {
          background: rgba(120, 120, 128, 0.12);
          color: rgba(60, 60, 67, 0.64);
        }

        .pdf-library-table-shell > div:last-of-type > div:first-child > div {
          height: 32px;
          min-width: 42px;
          border-radius: 999px;
          background: rgba(0, 122, 255, 0.10);
          color: #007aff;
          font-weight: 700;
        }

        .pdf-library-table-shell > div:last-of-type > div:last-child {
          color: rgba(60, 60, 67, 0.62);
          font-weight: 600;
        }
      `}</style>
      {children}
    </section>
  );
};
