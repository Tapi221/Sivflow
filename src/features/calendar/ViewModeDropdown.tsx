import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Check } from "@/ui/icons";
import { cn } from "@/lib/utils";
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

export const ViewModeDropdown = ({
  value,
  onChange,
  options,
}: Props) => {
  const selected = options.find((o) => o.value === value);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="
            flex h-8 items-center gap-1.5
            rounded-lg border border-[#e2e4e9]
            bg-white px-3
            text-[13px] font-medium text-[#25272d]
            transition-colors
            hover:bg-[#f5f6f8]
            focus:outline-none
            focus-visible:outline-none
            focus:ring-0
            focus-visible:ring-0
          "
        >
          {selected && (
            <>
              <selected.Icon className="h-3.5 w-3.5 text-[#8f929c]" />
              <span>{selected.label}</span>
            </>
          )}

          <ChevronDown className="h-3 w-3 text-[#8f929c]" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="
            z-50 min-w-[160px]
            overflow-hidden
            rounded-xl border border-[#e2e4e9]
            bg-white py-1
            shadow-[0_8px_24px_rgba(0,0,0,0.12)]
          "
        >
          <div className="px-3 py-1.5 text-[11px] font-medium text-[#a0a4b0]">
            Views
          </div>

          {options.map(({ value: v, label, Icon }) => {
            const isSelected = v === value;

            return (
              <DropdownMenu.Item
                key={v}
                onSelect={() => onChange(v)}
                className={cn(
                  "flex cursor-pointer items-center justify-between px-3 py-2 text-[13px] text-[#24272f] outline-none transition-colors",
                  "data-[highlighted]:bg-[#f5f6f8]"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[#8f929c]" />

                  <span className={isSelected ? "font-medium" : ""}>
                    {label}
                  </span>
                </div>

                {isSelected && (
                  <Check className="h-4 w-4 text-[#25272d]" />
                )}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};