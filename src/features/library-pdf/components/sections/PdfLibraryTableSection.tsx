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
          border-radius: 26px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(247, 248, 251, 0.84));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.95),
            inset 0 -1px 0 rgba(60, 60, 67, 0.08);
          padding: 8px;
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
          height: 42px;
          border: 0;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.78);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.94);
          color: rgba(60, 60, 67, 0.58);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
          padding: 0 16px;
        }

        .pdf-library-table-shell div[style*="grid-template-columns"]:not([role="button"]) button {
          color: inherit;
          font-weight: 700;
        }

        .pdf-library-table-shell div[style*="grid-template-columns"]:not([role="button"]) button[style*="color"] {
          color: #007aff !important;
        }

        .pdf-library-table-shell div[style*="grid-template-columns"]:not([role="button"]) [role="separator"] > div {
          height: 18px;
          border-radius: 999px;
          background: rgba(60, 60, 67, 0.16);
        }

        .pdf-library-table-shell .absolute[style*="background-color"] {
          background-color: rgba(0, 122, 255, 0.08) !important;
        }

        .pdf-library-table-shell .absolute.h-\[3px\][style*="background-color"] {
          border-radius: 999px;
          background-color: #007aff !important;
        }

        .pdf-library-table-shell div[role="button"][style*="grid-template-columns"] {
          height: 50px;
          margin-top: 6px;
          border-top: 0 !important;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.64);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.82),
            inset 0 0 0 1px rgba(255, 255, 255, 0.58);
          padding: 0 16px;
          transform: translateZ(0);
          transition:
            background-color 180ms ease,
            box-shadow 180ms ease,
            transform 180ms ease;
        }

        .pdf-library-table-shell div[role="button"][style*="grid-template-columns"]:hover {
          background: rgba(255, 255, 255, 0.94);
          box-shadow:
            0 12px 26px -20px rgba(15, 23, 42, 0.52),
            inset 0 0 0 1px rgba(255, 255, 255, 0.92);
          transform: translateY(-1px);
        }

        .pdf-library-table-shell div[role="button"][style*="grid-template-columns"].bg-\[\#f9fafb\] {
          background: rgba(0, 122, 255, 0.13);
          box-shadow:
            0 12px 26px -20px rgba(0, 122, 255, 0.58),
            inset 0 0 0 1px rgba(0, 122, 255, 0.18);
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
          background: rgba(120, 120, 128, 0.12);
          color: rgba(60, 60, 67, 0.68);
        }

        .pdf-library-table-shell div[role="button"] button[aria-label$="を開く"]:hover {
          background: rgba(0, 122, 255, 0.12);
          color: #007aff;
        }

        .pdf-library-table-shell > div:last-of-type {
          margin-top: 12px;
          border: 0;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.66);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
          padding: 10px 12px;
        }

        .pdf-library-table-shell > div:last-of-type button {
          height: 34px;
          width: 34px;
          border: 0;
          border-radius: 999px;
          background: rgba(120, 120, 128, 0.12);
          color: rgba(60, 60, 67, 0.64);
          font-size: 18px;
        }

        .pdf-library-table-shell > div:last-of-type button:not(:disabled):hover {
          background: rgba(0, 122, 255, 0.13);
          color: #007aff;
        }

        .pdf-library-table-shell > div:last-of-type > div:first-child > div {
          height: 34px;
          min-width: 44px;
          border-radius: 999px;
          background: rgba(0, 122, 255, 0.12);
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
