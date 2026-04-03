import { RuledLayer } from "@/components/card/frame/RuledLayer";
import { cn } from "@/lib/utils";
import React from "react";

type CSSVarStyle = React.CSSProperties &
  Partial<Record<`--${string}`, string | number>>;

type BlockSurfaceProps = {
  className?: string;
  contentClassName?: string;
  style?: CSSVarStyle;
  padTopRows?: number;
  padBottomRows?: number;
  padLeftRows?: number;
  padRightRows?: number;
  ruled?: boolean;
  ruledRowPx?: number;
  ruledOpacity?: number | string;
  ruledOffsetPx?: number;
  ruledBottomOffsetPx?: number;
  background?: string;
  bleedX?: boolean;
  children: React.ReactNode;
};

export const BlockSurface = ({
  className,
  contentClassName,
  style,
  padTopRows = 0,
  padBottomRows = 0,
  padLeftRows = 0,
  padRightRows = 0,
  ruled = true,
  ruledRowPx = 24,
  ruledOpacity,
  ruledOffsetPx = 0,
  ruledBottomOffsetPx = 0,
  background,
  bleedX = false,
  children,
}: BlockSurfaceProps) => {
  const topRows = padTopRows ?? 0;
  const bottomRows = padBottomRows ?? 0;
  const leftRows = padLeftRows ?? 0;
  const rightRows = padRightRows ?? 0;

  const cssVars: CSSVarStyle = {
    ...(style ?? {}),
    "--card-row-px": `${Math.max(8, ruledRowPx)}px`,
    "--card-line-height": `${Math.max(8, ruledRowPx)}px`,
    ...(topRows !== 0
      ? { paddingTop: `calc(var(--card-row-px) * ${topRows})` }
      : {}),
    ...(bottomRows !== 0
      ? { paddingBottom: `calc(var(--card-row-px) * ${bottomRows})` }
      : {}),
    ...(leftRows !== 0
      ? { paddingLeft: `calc(var(--card-row-px) * ${leftRows})` }
      : {}),
    ...(rightRows !== 0
      ? { paddingRight: `calc(var(--card-row-px) * ${rightRows})` }
      : {}),
  };

  return (
    <div
      className={cn(
        "blockSurface",
        bleedX && "blockSurface--bleedX",
        className,
      )}
      style={{ ...cssVars, ...(background ? { background } : {}) }}
    >
      {ruled ? (
        <RuledLayer
          kind="repeat-only"
          ruledOpacity={ruledOpacity}
          ruledRowPx={ruledRowPx}
          ruledOffsetPx={ruledOffsetPx}
          ruledBottomOffsetPx={ruledBottomOffsetPx}
        />
      ) : null}
      <div className={cn("blockSurfaceContent", contentClassName)}>
        {children}
      </div>
    </div>
  );
};
