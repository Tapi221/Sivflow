import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";

export type MultiOption = {
  value: string;
  label: string;
};

type Props = {
  value: string[];
  onChange: (value: string[]) => void;
  options: readonly MultiOption[];
  placeholder?: string;
};

export const MultiSelectDropdown = ({
  value,
  onChange,
  options,
  placeholder = "Select",
}: Props) => {
  const [open, setOpen] = useState(false);

  const selectedSet = new Set(value);

  const toggle = (v: string) => {
    const next = new Set(selectedSet);

    if (next.has(v)) next.delete(v);
    else next.add(v);

    onChange(Array.from(next));
  };

  const selectedLabels = options
    .filter((o) => selectedSet.has(o.value))
    .map((o) => o.label);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          onMouseDown={(e) => e.preventDefault()}
          className="
            inline-flex items-center
            rounded-full border border-[#d7dae0]
            bg-white px-2.5 py-1

            text-[12px] font-medium text-[#25272d]
            leading-none

            transition
            hover:bg-[#f5f6f8]

            whitespace-nowrap
            outline-none
          "
        >
          <span className="leading-none">
            {selectedLabels.length > 0
              ? selectedLabels.join(", ")
              : placeholder}
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={10}
          className="
            relative
            z-50

            min-w-[84px]
            overflow-visible

            rounded-md
            border border-[#e2e4e9]
            bg-white
            py-1

            text-[#25272d]
            shadow-[0_10px_25px_rgba(0,0,0,0.12)]

            animate-in fade-in-0 zoom-in-95 duration-150
            outline-none
          "
        >
          {/* arrow */}
          <span
            className="
              absolute
              top-[-5px]
              right-3
              h-2 w-2
              rotate-45

              border-l border-t border-[#e2e4e9]
              bg-white
            "
          />

          <div className="px-2 py-1 text-[10px] font-medium text-[#a0a4b0]">
            Filters
          </div>

          {options.map(({ value: v, label }) => {
            const isSelected = selectedSet.has(v);

            return (
              <button
                key={v}
                type="button"
                onClick={() => toggle(v)}
                className="
                  flex w-full items-center justify-between
                  gap-3

                  px-2 py-1

                  text-[11px]
                  font-medium
                  leading-none
                  text-left
                  text-[#25272d]

                  transition
                  hover:bg-[#f5f6f8]
                  outline-none
                "
              >
                <span>{label}</span>

                <span
                  className={`
                    h-3 w-3
                    shrink-0
                    rounded-sm
                    border border-[#cfd3dc]
                    transition

                    ${
                      isSelected
                        ? "bg-[#25272d] border-[#25272d]"
                        : "bg-white"
                    }
                  `}
                />
              </button>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};