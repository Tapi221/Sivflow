import React from "react";



type RatingKey = "forgot" | "vague" | "remembered" | "easy";
type Props = {
  counts: Record<RatingKey, number>;
  compact?: boolean;
  className?: string;
  disableHover?: boolean;
  singleColumn?: boolean;
  singleRow?: boolean;
  surface?: "convex" | "concave";
};



const FACE_DESIGN: Record<
  RatingKey,
  { iconWrap: string; label: string; svg: React.ReactNode; }
> = {
  forgot: {
    iconWrap: "ds-status-tone--danger ds-rating-tile__icon",
    label: "忘れた",
    svg: (
      <>
        <circle cx="12" cy="12" r="10" stroke="none" />
        <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </>
    ),
  },
  vague: {
    iconWrap: "ds-status-tone--warning ds-rating-tile__icon",
    label: "あいまい",
    svg: (
      <>
        <line x1="8" y1="15" x2="16" y2="15" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </>
    ),
  },
  remembered: {
    iconWrap: "ds-status-tone--info ds-rating-tile__icon",
    label: "覚えた",
    svg: (
      <>
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </>
    ),
  },
  easy: {
    iconWrap: "ds-status-tone--success ds-rating-tile__icon",
    label: "余裕",
    svg: (
      <>
        <path d="M8 13s1.5 3 4 3 4-3 4-3" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </>
    ),
  },
};
const ORDER: RatingKey[] = ["forgot", "vague", "remembered", "easy"];



const RatingCountTiles = ({ counts, compact = false, className = "", disableHover = false, singleColumn = false, singleRow = false, surface = "convex" }: Props) => {
  const surfaceClass = surface === "concave" ? "ds-rating-tile--concave" : "ds-rating-tile--convex";
  const gridClass = singleRow
    ? "grid grid-cols-4 gap-2"
    : singleColumn
      ? "grid grid-cols-1 gap-2"
      : `grid grid-cols-2 gap-2 ${compact ? "md:grid-cols-2" : "md:grid-cols-4 md:gap-3"}`;

  return (
    <div className={`${gridClass} ${className}`}>
      {ORDER.map((key) => {
        const design = FACE_DESIGN[key];
        return (
          <div
            key={key}
            className={`ds-rating-tile group ${surfaceClass} ${disableHover ? "" : "transform hover:scale-105"} ${singleColumn ? "flex items-center justify-between gap-2 p-2.5" : `flex flex-col items-center ${compact ? "p-2.5" : "p-3"}`}`}
          >
            <div
              className={`${singleColumn ? "" : "mb-1"} h-8 w-8 rounded-full flex items-center justify-center ${design.iconWrap}`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {design.svg}
              </svg>
            </div>
            {singleColumn ? (
              <>
                <span className="ds-rating-tile__label min-w-0 flex-1 truncate text-sm font-semibold">
                  {design.label}
                </span>
                <span className="ds-rating-tile__count text-convex text-base font-bold tabular-nums">
                  {counts[key] ?? 0}
                </span>
              </>
            ) : (
              <>
                <span className="ds-rating-tile__count text-convex text-base font-bold tabular-nums">
                  {counts[key] ?? 0}
                </span>
                <span className="ds-rating-tile__label text-xs font-semibold">
                  {design.label}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};



export { RatingCountTiles };
