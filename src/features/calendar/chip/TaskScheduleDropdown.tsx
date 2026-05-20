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
            rounded-full border border-[#e2e4e9]
            bg-white px-2.5 py-1
            text-[12px] font-medium text-[#25272d]
            shadow-sm transition
            hover:bg-[#f5f6f8]
            whitespace-nowrap
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
          sideOffset={6}
          className="
            z-50 w-fit min-w-[140px]
            overflow-hidden rounded-lg border border-[#e2e4e9]
            bg-white py-1 shadow-[0_10px_25px_rgba(0,0,0,0.12)]
          "
        >
          <div className="px-1.5 py-1 text-[10px] font-medium text-[#a0a4b0]">
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
                  px-1.5 py-1 text-[12px]
                  hover:bg-[#f5f6f8]
                "
              >
                <span className={isSelected ? "font-medium" : ""}>
                  {label}
                </span>

                <span
                  className={`
                    h-3 w-3 rounded border
                    ${isSelected ? "bg-[#25272d]" : "bg-white"}
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