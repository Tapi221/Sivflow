import type { CSSProperties } from "react";
import { memo } from "react";
import type { CalendarTimeGridLayoutEntry } from "@core/calendar";

type CalendarEventChipProperties = {
  entry: CalendarTimeGridLayoutEntry;
};

const CHIP_TEXT_FADE_STYLE: CSSProperties = {
  WebkitMaskImage: "linear-gradient(to right, #000 0%, #000 calc(100% - 12px), transparent 100%)",
  maskImage: "linear-gradient(to right, #000 0%, #000 calc(100% - 12px), transparent 100%)",
};

const getTimeLabel = (date: Date): string => {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getEventChipStyle = (entry: CalendarTimeGridLayoutEntry): CSSProperties => {
  const color = entry.event.accentColor || "#64748b";

  return {
    background: `linear-gradient(135deg, ${color}33, ${color}14)`,
    borderColor: `${color}99`,
    height: `calc(${entry.style.height}% - 4px)`,
    left: `${entry.style.xOffset}%`,
    top: `${entry.style.top}%`,
    width: `calc(${entry.style.width}% - 4px)`,
  };
};

const CalendarEventChip = memo(({ entry }: CalendarEventChipProperties) => {
  const title = entry.event.title || "Untitled";
  const timeLabel = `${getTimeLabel(entry.event.startsAt)} - ${getTimeLabel(entry.event.endsAt)}`;

  return (
    <article
      className="absolute min-h-6 overflow-hidden rounded-xl border px-2 py-1 text-left text-xs leading-tight text-white shadow-lg shadow-black/20"
      style={getEventChipStyle(entry)}
      title={`${timeLabel} ${title}`}
    >
      <div className="font-semibold tabular-nums text-white/90">{timeLabel}</div>
      <div className="mt-0.5 min-w-0 overflow-hidden whitespace-nowrap font-medium" style={CHIP_TEXT_FADE_STYLE}>
        {title}
      </div>
      {entry.columnCount && entry.columnCount > 1 ? (
        <div className="mt-0.5 text-[10px] text-white/50">
          col {entry.columnIndex ?? 0}/{entry.columnCount}
        </div>
      ) : null}
    </article>
  );
});

CalendarEventChip.displayName = "CalendarEventChip";

export { CalendarEventChip };
