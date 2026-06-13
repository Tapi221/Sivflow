"use client";

import * as React from "react";
import { isEqualTags } from "@platejs/tag";
import { MultiSelectPlugin, TagPlugin, useSelectableItems, useSelectEditorCombobox } from "@platejs/tag/react";
import { Command as CommandPrimitive, useCommandActions } from "@udecode/cmdk";
import { Fzf } from "fzf";
import { PlusIcon } from "lucide-react";
import { isHotkey, KEYS } from "platejs";
import { Plate, useEditorContainerRef, useEditorRef, usePlateEditor } from "platejs/react";
import { Editor, EditorContainer } from "@/chip/ui/plate/editor";
import { TagElement } from "@/chip/ui/plate/tag-node";
import { Popover, PopoverAnchor, PopoverContent } from "@/chip/ui/popover";
import { cn } from "@/lib/utils";

type SelectItem = {
  value: string;
  isNew?: boolean;
};
type SelectEditorContextValue = {
  items: SelectItem[];
  open: boolean;
  setOpen: (open: boolean) => void;
  defaultValue?: SelectItem[];
  value?: SelectItem[];
  onValueChange?: (items: SelectItem[]) => void;
};

const SelectEditorContext = React.createContext<SelectEditorContextValue | undefined>(undefined);

const useSelectEditorContext = () => {
  const context = React.useContext(SelectEditorContext);
  if (!context) {
    throw new Error("useSelectEditor must be used within SelectEditor");
  }
  return context;
};
const createEditorValue = (value?: SelectItem[]) => [
  {
    children: [
      { text: "" },
      ...(value?.flatMap((item) => [
        {
          children: [{ text: "" }],
          type: KEYS.tag,
          ...item,
        },
        {
          text: "",
        },
      ]) ?? []),
    ],
    type: KEYS.p,
  },
];
const fzfFilter = (value: string, search: string): boolean => {
  if (!search) return true;
  const fzf = new Fzf([value], {
    casing: "case-insensitive",
    selector: (targetValue: string) => targetValue,
  });
  return fzf.find(search).length > 0;
};

const Command = ({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) => {
  return (
    <CommandPrimitive
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
        className,
      )}
      data-slot="command"
      {...props}
    />
  );
};
const CommandList = ({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) => {
  return (
    <CommandPrimitive.List
      className={cn(
        "max-h-[300px] scroll-py-1 overflow-y-auto overflow-x-hidden",
        className,
      )}
      data-slot="command-list"
      {...props}
    />
  );
};
const CommandGroup = ({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) => {
  return (
    <CommandPrimitive.Group
      className={cn(
        "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:text-xs",
        className,
      )}
      data-slot="command-group"
      {...props}
    />
  );
};
const CommandItem = ({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) => {
  return (
    <CommandPrimitive.Item
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg:not([class*=\"size-\"])]:size-4 [&_svg:not([class*=\"text-\"])]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      data-slot="command-item"
      {...props}
    />
  );
};
const SelectEditor = ({ children, defaultValue, items = [], value, onValueChange }: { children: React.ReactNode; defaultValue?: SelectItem[]; items?: SelectItem[]; value?: SelectItem[]; onValueChange?: (items: SelectItem[]) => void }) => {
  const [open, setOpen] = React.useState(false);
  const [internalValue] = React.useState(defaultValue);
  return (
    <SelectEditorContext.Provider
      value={{
        items,
        open,
        setOpen,
        value: value ?? internalValue,
        onValueChange,
      }}
    >
      <Command className="overflow-visible bg-transparent has-data-readonly:w-fit" shouldFilter={false} loop>
        {children}
      </Command>
    </SelectEditorContext.Provider>
  );
};
const SelectEditorContent = ({ children }: { children: React.ReactNode }) => {
  const { value } = useSelectEditorContext();
  const { setSearch } = useCommandActions();
  const editor = usePlateEditor(
    {
      plugins: [MultiSelectPlugin.withComponent(TagElement)],
      value: createEditorValue(value),
    },
    [],
  );
  React.useEffect(() => {
    if (!isEqualTags(editor, value)) {
      editor.tf.replaceNodes(createEditorValue(value), {
        at: [],
        children: true,
      });
    }
  }, [editor, value]);
  return (
    <Plate
      onValueChange={({ editor: currentEditor }) => {
        setSearch(currentEditor.api.string([]));
      }}
      editor={editor}
    >
      <EditorContainer variant="select">{children}</EditorContainer>
    </Plate>
  );
};
const SelectEditorInput = ({ ref, ...props }: React.ComponentPropsWithoutRef<typeof Editor> & { ref?: React.RefObject<HTMLDivElement | null> }) => {
  const editor = useEditorRef();
  const { setOpen } = useSelectEditorContext();
  const { selectCurrentItem, selectFirstItem } = useCommandActions();
  return (
    <Editor
      ref={ref}
      variant="select"
      onBlur={() => setOpen(false)}
      onFocusCapture={() => {
        setOpen(true);
        selectFirstItem();
      }}
      onKeyDown={(event) => {
        if (isHotkey("enter", event)) {
          event.preventDefault();
          selectCurrentItem();
          editor.tf.removeNodes({ at: [], empty: false, text: true });
        }
        if (isHotkey("escape", event) || isHotkey("mod+enter", event)) {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      autoFocusOnEditable
      {...props}
    />
  );
};
const SelectEditorCombobox = () => {
  const editor = useEditorRef();
  const containerRef = useEditorContainerRef();
  const { items, open, onValueChange } = useSelectEditorContext();
  const selectableItems = useSelectableItems({
    filter: fzfFilter,
    items,
  });
  const { selectFirstItem } = useCommandActions();
  useSelectEditorCombobox({ open, selectFirstItem, onValueChange });
  if (!open || selectableItems.length === 0) return null;
  return (
    <Popover open={open}>
      <PopoverAnchor virtualRef={containerRef as React.RefObject<HTMLElement>} />
      <PopoverContent
        className="p-0 data-[state=open]:animate-none"
        style={{
          width: (containerRef.current?.offsetWidth ?? 0) + 8,
        }}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
        align="start"
        alignOffset={-4}
        sideOffset={8}
      >
        <CommandList>
          <CommandGroup>
            {selectableItems.map((item) => (
              <CommandItem
                key={item.value}
                className="cursor-pointer gap-2"
                onMouseDown={(event) => event.preventDefault()}
                onSelect={() => {
                  editor.getTransforms(TagPlugin).insert.tag(item);
                }}
              >
                {item.isNew ? (
                  <div className="flex items-center gap-1">
                    <PlusIcon className="size-4 text-foreground" />
                    Create new label:
                    <span className="text-gray-600">&quot;{item.value}&quot;</span>
                  </div>
                ) : item.value}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </PopoverContent>
    </Popover>
  );
};

export { SelectEditor, SelectEditorContent, SelectEditorInput, SelectEditorCombobox };
export type { SelectItem };
