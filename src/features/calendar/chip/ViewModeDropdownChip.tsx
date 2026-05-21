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
          className="
            inline-flex items-center
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
          sideOffset={6}
          className="
            z-50
            w-fit min-w-[90px]

            overflow-hidden
            rounded-lg border border-[#e2e4e9]
            bg-white py-1

            shadow-[0_10px_25px_rgba(0,0,0,0.12)]
          "
        >
          <div className="px-1.5 py-1 text-[10px] font-medium text-[#a0a4b0]">
            {t.viewsLabel}
          </div>

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
                  flex w-full items-center justify-between
                  px-1.5 py-1

                  text-[12px]
                  leading-none
                  text-left

                  hover:bg-[#f5f6f8]
                  outline-none
                "
              >
                <span className={isSelected ? "font-medium" : ""}>
                  {label}
                </span>

                {isSelected && (
                  <span
                    className="
                      ml-1.5
                      h-1.5 w-1.5
                      shrink-0
                      rounded-full
                      bg-[#25272d]
                    "
                  />
                )}
              </button>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};