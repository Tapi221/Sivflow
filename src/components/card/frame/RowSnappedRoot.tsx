import React from "react";
import { RowSnap } from "./RowSnap";

type RowSnappedRootProps = {
  rowPx: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export const RowSnappedRoot = ({
  rowPx,
  className,
  style,
  children,
}: RowSnappedRootProps) => {
  return (
    <RowSnap rowPx={rowPx}>
      {({ snapPaddingBottomPx, snapRef }) => (
        <div
          ref={snapRef as React.Ref<HTMLDivElement>}
          className={className}
          style={{
            ...(style ?? {}),
            ["--snap-pad-b" as const]: `${snapPaddingBottomPx}px`,
          }}
        >
          {children}
        </div>
      )}
    </RowSnap>
  );
};
