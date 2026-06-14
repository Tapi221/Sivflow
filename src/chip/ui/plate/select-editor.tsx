"use client";

import * as React from "react";
import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectItem = {
  value: string;
  isNew?: boolean;
};
type SelectEditorContextValue = {
  items: SelectItem[];
  open: boolean;
  search: string;
  setOpen: (open: boolean) => void;
  setSearch: (search: string) => void;
  setValue: (items: SelectItem[]) => void;
  value: SelectItem[];
};
type SelectEditorProps = {
  children: React.ReactNode;
  className?: string;
  defaultValue?: SelectItem[];
  items?: SelectItem[];
  value?: SelectItem[];
  onValueChange?: (items: SelectItem[]) => void;
};
type SelectEditorInputProps = React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.Ref<HTMLDivElement>;
};

const SelectEditorContext = React.createContext<SelectEditorContextValue | undefined>(undefined);

const useSelectEditorContext = () => {
  const context = React.useContext(SelectEditorContext);
  if (context === undefined) {
    throw new Error("useSelectEditor must be used within SelectEditor");
  }
  return context;
};
const getSelectableItems = (items: SelectItem[], search: string) => {
  const trimmedSearch = search.trim();
  const normalizedSearch = trimmedSearch.toLowerCase();
  const filteredItems = normalizedSearch.length === 0
    ? items
    : items.filter((item) => item.value.toLowerCase().includes(normalizedSearch));
  const hasExactItem = items.some((item) => item.value.toLowerCase() === normalizedSearch);
  if (trimmedSearch.length === 0 || hasExactItem) return filteredItems;
  return [...filteredItems, { value: trimmedSearch, isNew: true }];
};
const getNextValue = (value: SelectItem[], item: SelectItem) => {
  if (value.some((selectedItem) => selectedItem.value === item.value)) return value;
  return [...value, { value: item.value }];
};
const selectItem = (context: SelectEditorContextValue, item: SelectItem) => {
  context.setValue(getNextValue(context.value, item));
  context.setSearch("");
};

const SelectEditor = ({ children, className, defaultValue, items = [], value, onValueChange }: SelectEditorProps) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [internalValue, setInternalValue] = React.useState<SelectItem[]>(defaultValue ?? []);
  const resolvedValue = value ?? internalValue;
  const setValue = React.useCallback(
    (nextValue: SelectItem[]) => {
      if (value === undefined) {
        setInternalValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [onValueChange, value],
  );
  return (
    <SelectEditorContext.Provider value={{ items, open, search, setOpen, setSearch, setValue, value: resolvedValue }}>
      <div className={cn("relative flex h-full w-full flex-col overflow-visible bg-transparent has-data-readonly:w-fit", className)}>
        {children}
      </div>
    </SelectEditorContext.Provider>
  );
};
const SelectEditorContent = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => {
  return <div className={cn("relative", className)} {...props}>{children}</div>;
};
const SelectEditorInput = ({ ref, className, onBlur, onFocus, onInput, onKeyDown, tabIndex, ...props }: SelectEditorInputProps) => {
  const context = useSelectEditorContext();
  return (
    <div
      {...props}
      ref={ref}
      className={cn("min-h-9 w-full rounded-md px-2 py-1.5 text-sm outline-none", className)}
      contentEditable
      role="textbox"
      suppressContentEditableWarning
      tabIndex={tabIndex ?? 0}
      onBlur={(event) => {
        context.setOpen(false);
        onBlur?.(event);
      }}
      onFocus={(event) => {
        context.setOpen(true);
        onFocus?.(event);
      }}
      onInput={(event) => {
        context.setSearch(event.currentTarget.textContent ?? "");
        onInput?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          const [firstItem] = getSelectableItems(context.items, context.search);
          if (firstItem !== undefined) {
            selectItem(context, firstItem);
            event.currentTarget.textContent = "";
          }
        }
        if (event.key === "Escape") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        onKeyDown?.(event);
      }}
    />
  );
};
const SelectEditorCombobox = () => {
  const context = useSelectEditorContext();
  const selectableItems = React.useMemo(() => getSelectableItems(context.items, context.search), [context.items, context.search]);
  if (!context.open || selectableItems.length === 0) return null;
  return (
    <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
      {selectableItems.map((item) => (
        <button key={item.value} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectItem(context, item)}>
          {item.isNew === true ? <span className="flex items-center gap-1"><PlusIcon className="size-4 text-foreground" />Create new label:<span className="text-gray-600">&quot;{item.value}&quot;</span></span> : item.value}
        </button>
      ))}
    </div>
  );
};

export { SelectEditor, SelectEditorContent, SelectEditorInput, SelectEditorCombobox };
export type { SelectItem };
