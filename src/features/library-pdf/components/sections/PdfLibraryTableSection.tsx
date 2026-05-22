import type { ReactNode } from "react";

type PdfLibraryTableSectionProps = {
  children: ReactNode;
};

export const PdfLibraryTableSection = ({
  children,
}: PdfLibraryTableSectionProps) => {
  return (
    <section className="min-h-0 flex-1 rounded-[10px] bg-[#FFFFFF]">
      {children}
    </section>
  );
};
