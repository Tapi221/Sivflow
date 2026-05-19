import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "@/ui/icons";
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

export const ViewModeDropdown = ({ value, onChange, options }: Props) => {
  const selected = options.find((o) => o.value === value);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="
            inline-flex items-center gap-1.5
            rounded-full border border-[#e2e4e9]
            bg-white px-2.5 py-1
            text-[12px] font-medium text-[#25272d]
            shadow-sm
            transition
            hover:bg-[#f5f6f8]
            active:scale-[0.98]
            outline-none
            whitespace-nowrap
          "
        >
          {selected?.Icon && (
            <selected.Icon className="h-3.5 w-3.5 text-[#6b7280]" />
          )}

          <span className="leading-none">
            {selected?.label}
          </span>

          <ChevronDown className="h-3 w-3 text-[#9aa0aa]" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="
            z-50
            w-fit
            min-w-0
            max-w-none
            overflow-hidden
            rounded-lg border border-[#e2e4e9]
            bg-white py-1
            shadow-[0_10px_25px_rgba(0,0,0,0.12)]
          "
        >
          <div className="px-2 py-1 text-[10px] font-medium text-[#a0a4b0] whitespace-nowrap">
            Views
          </div>

          {options.map(({ value: v, label, Icon }) => {
            const isSelected = v === value;

            return (
              <DropdownMenu.Item
                key={v}
                onSelect={() => onChange(v)}
                className={cn(
                  "flex items-center gap-2",
                  "px-2 py-1.5 text-[12px]",
                  "whitespace-nowrap",
                  "outline-none transition-colors",
                  "data-[highlighted]:bg-[#f5f6f8]"
                )}
              >
                <Icon className="h-3.5 w-3.5 text-[#6b7280]" />

                <span className={isSelected ? "font-medium" : ""}>
                  {label}
                </span>

                {isSelected && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#25272d]" />
                )}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};