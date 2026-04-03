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
  { iconWrap: string; labelHover: string; label: string; svg: React.ReactNode }
> = {
  forgot: {
    iconWrap: "bg-red-50 text-[#FF5A65] face-badge-convex",
    labelHover: "group-hover:text-[#FF5A65]",
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
    iconWrap: "bg-amber-50 text-[#F9A825] face-badge-convex",
    labelHover: "group-hover:text-[#F9A825]",
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
    iconWrap: "bg-blue-50 text-[#00A3FF] face-badge-convex",
    labelHover: "group-hover:text-[#00A3FF]",
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
    iconWrap: "bg-emerald-50 text-[#00B67A] face-badge-convex",
    labelHover: "group-hover:text-[#00B67A]",
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

export function RatingCountTiles({
  counts,
  compact = false,
  className = "",
  disableHover = false,
  singleColumn = false,
  singleRow = false,
  surface = "convex",
}: Props) {
  const surfaceClass =
    surface === "concave" ? "surface-concave" : "surface-convex";
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
            className={`group bg-white rounded-2xl border border-[var(--surface-border)] ${surfaceClass} ${disableHover ? "" : "transform transition-all hover:scale-105"} ${singleColumn ? "flex items-center justify-between gap-2 p-2.5" : `flex flex-col items-center ${compact ? "p-2.5" : "p-3"}`}`}
          >
            <div
              className={`${singleColumn ? "" : "mb-1"} w-8 h-8 rounded-full flex items-center justify-center ${disableHover ? "" : "transition-transform group-hover:scale-110"} ${design.iconWrap}`}
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
                <span
                  className={`min-w-0 flex-1 truncate text-sm text-[#94a3b8] font-semibold ${disableHover ? "" : design.labelHover}`}
                >
                  {design.label}
                </span>
                <span className="text-convex text-base font-bold text-[#1e293b] tabular-nums">
                  {counts[key] ?? 0}
                </span>
              </>
            ) : (
              <>
                <span className="text-convex text-base font-bold text-[#1e293b] tabular-nums">
                  {counts[key] ?? 0}
                </span>
                <span
                  className={`text-[10px] text-[#94a3b8] font-semibold ${disableHover ? "" : design.labelHover}`}
                >
                  {design.label}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}





