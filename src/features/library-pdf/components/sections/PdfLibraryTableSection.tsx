import type { ReactNode } from "react";

type PdfLibraryTableSectionProps = {
  children: ReactNode;
};

export const PdfLibraryTableSection = ({
  children,
}: PdfLibraryTableSectionProps) => {
  return (
    <section className="min-h-0 flex-1 rounded-[30px] border border-white/70 bg-white/70 p-2 shadow-[0_28px_72px_-44px_rgba(15,23,42,0.58)] backdrop-blur-2xl">
      {children}
    </section>
  );
};
