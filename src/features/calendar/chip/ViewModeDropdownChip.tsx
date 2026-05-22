import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";

import { useT } from "@/i18n/useT";

import { IconCheck } from "./IconCheck";

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
            h-7
            min-w-[48px]
            items-center
            justify-center
            rounded-full
            border
            border-[#d8dce5]
            bg-white/90
            px-2.5
            text-[12px]
            font-semibold
            leading-none
            text-[#1f2937]
            shadow-[0_1px_2px_rgba(15,23,42,0.04)]
            outline-none
            backdrop-blur-xl
            transition-all
            duration-150
            hover:bg-white
            hover:shadow-[0_2px_5px_rgba(15,23,42,0.07)]
            active:scale-[0.97]
            active:bg-[#f6f7fb]
            data-[state=open]:border-[#cfd5e0]
            data-[state=open]:bg-white
            data-[state=open]:shadow-[0_2px_6px_rgba(15,23,42,0.08)]
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
          sideOffset={7}
          className="
            relative
            z-50
            min-w-[106px]
            overflow-visible
            rounded-[15px]
            border
            border-white/70
            bg-white/92
            p-1
            text-[#1f2937]
            shadow-[0_12px_30px_rgba(15,23,42,0.14),0_2px_7px_rgba(15,23,42,0.05)]
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
              right-4
              top-[-4px]
              h-2.5
              w-2.5
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

          <div className="px-2 pb-1 pt-0.5 text-[10px] font-semibold text-[#9aa0aa]">
            {t.viewsLabel}
          </div>

          <div className="overflow-hidden rounded-[12px]">
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
                    h-8
                    w-full
                    items-center
                    justify-between
                    gap-3
                    px-2.5
                    text-left
                    text-[12px]
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

                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                    {isSelected && (
                      <IconCheck className="h-3.5 w-3.5 text-[#007aff]" />
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
