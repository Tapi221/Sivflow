import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";

import { useT } from "@/i18n/useT";

export type ViewMode = "month" | "week" | "days";

export type ViewModeOption = {
  value: ViewMode;
  label: string;
};

type Props = {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  options: readonly ViewModeOption[];
};

const IconCheck = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M3.5 8.25L6.5 11.25L12.75 4.75"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ViewModeDropdown = ({
  value,
  onChange,
  options,
}: Props) => {
  const t = useT();
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          onMouseDown={(e) => e.preventDefault()}
          className="
            inline-flex
            h-8
            min-w-[54px]
            items-center
            justify-center
            rounded-full
            border
            border-[#d8dce5]
            bg-white/90
            px-3
            text-[13px]
            font-semibold
            leading-none
            text-[#1f2937]
            shadow-[0_1px_2px_rgba(15,23,42,0.05)]
            outline-none
            backdrop-blur-xl
            transition-all
            duration-150
            hover:bg-white
            hover:shadow-[0_2px_6px_rgba(15,23,42,0.08)]
            active:scale-[0.97]
            active:bg-[#f6f7fb]
            data-[state=open]:border-[#cfd5e0]
            data-[state=open]:bg-white
            data-[state=open]:shadow-[0_2px_8px_rgba(15,23,42,0.1)]
            whitespace-nowrap
          "
        >
          <span className="leading-none">
            {selected?.label}
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={8}
          className="
            relative
            z-50
            min-w-[124px]
            overflow-visible
            rounded-[18px]
            border
            border-white/70
            bg-white/92
            p-1.5
            text-[#1f2937]
            shadow-[0_16px_40px_rgba(15,23,42,0.16),0_2px_8px_rgba(15,23,42,0.06)]
            backdrop-blur-2xl
            outline-none
            animate-in
            fade-in-0
            zoom-in-95
            slide-in-from-top-1
            duration-150
          "
        >
          <span
            className="
              absolute
              right-5
              top-[-5px]
              h-3
              w-3
              rotate-45
              rounded-[3px]
              border-l
              border-t
              border-white/70
              bg-white/92
              backdrop-blur-2xl
            "
            aria-hidden="true"
          />

          <div className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold text-[#9aa0aa]">
            {t.viewsLabel}
          </div>

          <div className="overflow-hidden rounded-[13px]">
            {options.map(({ value: v, label }) => {
              const isSelected = v === value;

              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    onChange(v);
                    setOpen(false);
                  }}
                  className="
                    flex
                    h-9
                    w-full
                    items-center
                    justify-between
                    gap-4
                    px-3
                    text-left
                    text-[13px]
                    font-medium
                    leading-none
                    text-[#1f2937]
                    outline-none
                    transition-colors
                    hover:bg-[#f2f4f8]
                    active:bg-[#e9edf5]
                  "
                >
                  <span>{label}</span>

                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {isSelected && (
                      <IconCheck className="h-4 w-4 text-[#007aff]" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};