import {
  CALENDAR_EVENT_TOKENS,
  type CalendarEventVariant,
} from "./calendar.event-tokens";

type CalendarEventLabelProps = {
  time: string;
  title: string;
  variant?: CalendarEventVariant;
  hasVideo?: boolean;
};

const VideoCameraIcon = ({ color }: { color: string }) => (
  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
    <rect x=".5" y="1.5" width="5" height="5" rx=".5"
      stroke={color} strokeWidth="1" />
    <path d="M5.5 3L7.5 2V6L5.5 5Z"
      stroke={color} strokeWidth="1" strokeLinejoin="round" />
  </svg>
);

export const CalendarEventLabel = ({
  time,
  title,
  variant = "blue",
  hasVideo = false,
}: CalendarEventLabelProps) => {
  const tok = CALENDAR_EVENT_TOKENS[variant];

  return (
    <div
      style={{
        background:  tok.bg,
        borderLeft:  `4px solid ${tok.border}`,
        color:       tok.text,
      }}
      className="flex flex-col gap-0.5 rounded-[4px] px-2 py-1"
    >
      <div className="flex items-center gap-1 text-[11px] font-normal leading-[1.4]">
        <span>{time}</span>
        {hasVideo && <VideoCameraIcon color={tok.border} />}
      </div>
      <span className="text-[12px] font-medium leading-[1.35]">
        {title}
      </span>
    </div>
  );
};