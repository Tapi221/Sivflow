import React from "react";
import type { CssVars } from "@/types/style";
import { RowSnap } from "./RowSnap";

type RowSnappedRootProps = {
  rowPx: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

const RowSnappedRoot = ({
  rowPx,
  className,
  style,
  children,
}: RowSnappedRootProps) => {
  return (
    <RowSnap rowPx={rowPx}>
      {({ snapPaddingBottomPx, snapRef }) => {
        const snappedStyle: CssVars = {
          ...(style ?? {}),
          "--snap-pad-b": `${snapPaddingBottomPx}px`,
        };

        return (
          <div
            ref={snapRef as React.Ref<HTMLDivElement>}
            className={className}
            style={snappedStyle}
          >
            {children}
          </div>
        );
      }}
    </RowSnap>
  );
};

export { RowSnappedRoot };
