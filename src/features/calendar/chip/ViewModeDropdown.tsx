import * as Popover from "@radix-ui/react-popover";
import { useRef, useState } from "react";
import { ChevronDown } from "@/ui/icons";
import type { ComponentType } from "react";

export type ViewMode = "month" | "week" | "days";

export type ViewModeOption = {
  value: ViewMode;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

type Props = {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  options: ViewModeOption[];
};

export const ViewModeDropdown = ({ value, onChange, options }: Props) => {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  const selected = options.find((o) => o.value === value);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const openMenu = () => {
    clearTimer();
    setOpen(true);
  };

  const closeMenu = () => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 120);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {/* Trigger */}
      <Popover.Trigger asChild>
        <button
          type="button"
          onMouseEnter={openMenu}
          onMouseLeave={closeMenu}
          onClick={() => setOpen((v) => !v)}
          onMouseDown={(e) => e.preventDefault()}
          className="
            inline-flex items-center gap-1.5
            rounded-full border border-[#e2e4e9]
            bg-white px-2.5 py-1

            text-[12px] font-medium text-[#25272d]
            leading-none

            shadow-sm
            transition
            hover:bg-[#f5f6f8]
            active:scale-[0.98]

            whitespace-nowrap
            outline-none

            focus:outline-none
            focus:ring-0
            focus-visible:outline-none
            focus-visible:ring-0
            focus-visible:shadow-none
          "
        >
          {selected?.Icon && (
            <selected.Icon className="h-3.5 w-3.5 text-[#6b7280] shrink-0" />
          )}

          <span className="leading-none">
            {selected?.label}
          </span>

          <ChevronDown className="h-3 w-3 text-[#9aa0aa]" />
        </button>
      </Popover.Trigger>

      {/* Portal */}
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          onMouseEnter={openMenu}
          onMouseLeave={closeMenu}
          className="
            z-50
            w-[180px]

            overflow-hidden
            rounded-lg border border-[#e2e4e9]
            bg-white py-1

            shadow-[0_10px_25px_rgba(0,0,0,0.12)]

            origin-top-right
          "
        >
          {/* header */}
          <div className="px-2 py-1 text-[10px] font-medium text-[#a0a4b0] whitespace-nowrap">
            Views
          </div>

          {/* items */}
          {options.map(({ value: v, label, Icon }) => {
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
                  flex w-full items-center justify-between

                  px-2 py-1.5

                  text-[12px]
                  leading-none

                  text-left
                  whitespace-nowrap

                  hover:bg-[#f5f6f8]

                  outline-none
                "
              >
                {/* left */}
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-3.5 w-3.5 text-[#6b7280] shrink-0" />

                  <span className={isSelected ? "font-medium" : ""}>
                    {label}
                  </span>
                </div>

                {/* right dot */}
                {isSelected && (
                  <span className="ml-2 h-1.5 w-1.5 rounded-full bg-[#25272d] shrink-0" />
                )}
              </button>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};