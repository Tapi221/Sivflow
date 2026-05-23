import type { ReactNode } from "react";

type CardSetLibraryTableSectionProps = {
  children: ReactNode;
};

export const CardSetLibraryTableSection = ({
  children,
}: CardSetLibraryTableSectionProps) => {
  return (
    <section className="min-h-0 flex-1 rounded-[10px] bg-[#FFFFFF]">
      {children}
    </section>
  );
};
