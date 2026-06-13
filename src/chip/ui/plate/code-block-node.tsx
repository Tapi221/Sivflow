"use client";

import * as React from "react";

import { formatCodeBlock, isLangSupported } from "@platejs/code-block";

import { BracesIcon, Check, CheckIcon, CopyIcon } from "lucide-react";

import type { TCodeBlockElement, TCodeSyntaxLeaf } from "platejs";

import { NodeApi } from "platejs";

import type { PlateElementProps, PlateLeafProps } from "platejs/react";

import { PlateElement, PlateLeaf, useEditorRef, useElement, useReadOnly } from "platejs/react";

import { Button } from "@/chip/ui/button/button";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/chip/ui/command";

import { Popover, PopoverContent, PopoverTrigger } from "@/chip/ui/popover";

import { cn } from "@/lib/utils";



const languages: { label: string; value: string }[] = [
  { label: "Auto", value: "auto" },
  { label: "Plain Text", value: "plaintext" },
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "HTML", value: "html" },
  { label: "CSS", value: "css" },
  { label: "JSON", value: "json" },
  { label: "Markdown", value: "markdown" },
  { label: "Python", value: "python" },
  { label: "Rust", value: "rust" },
  { label: "Swift", value: "swift" },
  { label: "YAML", value: "yaml" },
];



const CodeBlockCombobox = () => {
  const [open, setOpen] = React.useState(false);
  const readOnly = useReadOnly();
  const editor = useEditorRef();
  const element = useElement<TCodeBlockElement>();
  const value = element.lang ?? "plaintext";
  const [searchValue, setSearchValue] = React.useState("");
  const items = React.useMemo(
    () => languages.filter((language) => !searchValue || language.label.toLowerCase().includes(searchValue.toLowerCase())),
    [searchValue],
  );
  if (readOnly) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-6 select-none justify-between gap-1 px-2 text-muted-foreground text-xs" aria-expanded={open} role="combobox">
          {languages.find((language) => language.value === value)?.label ?? "Plain Text"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" onCloseAutoFocus={() => setSearchValue("")}>
        <Command shouldFilter={false}>
          <CommandInput className="h-9" value={searchValue} onValueChange={(value) => setSearchValue(value)} placeholder="Search language..." />
          <CommandEmpty>No language found.</CommandEmpty>
          <CommandList className="h-[344px] overflow-y-auto">
            <CommandGroup>
              {items.map((language) => (
                <CommandItem
                  key={language.label}
                  className="cursor-pointer"
                  value={language.value}
                  onSelect={(value) => {
                    editor.tf.setNodes<TCodeBlockElement>({ lang: value }, { at: element });
                    setSearchValue(value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn(value === language.value ? "opacity-100" : "opacity-0")} />
                  {language.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const CopyButton = ({ value, ...props }: { value: (() => string) | string } & Omit<React.ComponentProps<typeof Button>, "value">) => {
  const [hasCopied, setHasCopied] = React.useState(false);
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setHasCopied(false);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [hasCopied]);
  return (
    <Button
      onClick={() => {
        void navigator.clipboard.writeText(typeof value === "function" ? value() : value);
        setHasCopied(true);
      }}
      {...props}
    >
      <span className="sr-only">Copy</span>
      {hasCopied ? <CheckIcon className="!size-3" /> : <CopyIcon className="!size-3" />}
    </Button>
  );
};

const CodeBlockElement = (props: PlateElementProps<TCodeBlockElement>) => {
  const { editor, element } = props;
  return (
    <PlateElement className="py-1" {...props}>
      <div className="relative rounded-md bg-muted/50">
        <pre className="overflow-x-auto p-8 pr-4 font-mono text-sm leading-[normal] [tab-size:2] print:break-inside-avoid">
          <code>{props.children}</code>
        </pre>
        <div className="absolute top-1 right-1 z-10 flex select-none gap-0.5" contentEditable={false}>
          {isLangSupported(element.lang) && (
            <Button size="icon" variant="ghost" className="size-6 text-xs" onClick={() => formatCodeBlock(editor, { element })} title="Format code">
              <BracesIcon className="!size-3.5 text-muted-foreground" />
            </Button>
          )}
          <CodeBlockCombobox />
          <CopyButton size="icon" variant="ghost" className="size-6 gap-1 text-muted-foreground text-xs" value={() => NodeApi.string(element)} />
        </div>
      </div>
    </PlateElement>
  );
};

const CodeLineElement = (props: PlateElementProps) => {
  return <PlateElement {...props} />;
};

const CodeSyntaxLeaf = (props: PlateLeafProps<TCodeSyntaxLeaf>) => {
  const tokenClassName = props.leaf.className as string;
  return <PlateLeaf className={tokenClassName} {...props} />;
};



export { CodeBlockElement, CodeLineElement, CodeSyntaxLeaf };
