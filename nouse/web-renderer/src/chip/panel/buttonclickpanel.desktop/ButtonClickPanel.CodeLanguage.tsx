"use client";

import { Button } from "@web-renderer/chip/button/button/button";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@web-renderer/chip/ui/command";

import { Popover, PopoverContent, PopoverTrigger } from "@web-renderer/chip/ui/popover";

import { cn } from "@web-renderer/lib/utils";

import { Check } from "lucide-react";



type ButtonClickPanelCodeLanguageItem = {
  label: string;
  value: string;
};

type ButtonClickPanelCodeLanguageProps = {
  open: boolean;
  selectedValue: string;
  searchValue: string;
  items: ButtonClickPanelCodeLanguageItem[];
  languages: ButtonClickPanelCodeLanguageItem[];
  onOpenChange: (open: boolean) => void;
  onLanguageSelect: (value: string) => void;
  onSearchValueChange: (value: string) => void;
};



const getSelectedLanguageLabel = (languages: ButtonClickPanelCodeLanguageItem[], selectedValue: string) => {
  return languages.find((language) => language.value === selectedValue)?.label ?? "Plain Text";
};



const ButtonClickPanelCodeLanguage = ({
  open,
  selectedValue,
  searchValue,
  items,
  languages,
  onOpenChange,
  onLanguageSelect,
  onSearchValueChange,
}: ButtonClickPanelCodeLanguageProps) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-6 select-none justify-between gap-1 px-2 text-muted-foreground text-xs" aria-expanded={open} role="combobox">
          {getSelectedLanguageLabel(languages, selectedValue)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" onCloseAutoFocus={() => onSearchValueChange("")}>
        <Command shouldFilter={false}>
          <CommandInput className="h-9" value={searchValue} onValueChange={onSearchValueChange} placeholder="Search language..." />
          <CommandEmpty>No language found.</CommandEmpty>
          <CommandList className="h-80 overflow-y-auto">
            <CommandGroup>
              {items.map((language) => (
                <CommandItem
                  key={language.label}
                  className="cursor-pointer"
                  value={language.value}
                  onSelect={() => onLanguageSelect(language.value)}
                >
                  <Check className={cn(selectedValue === language.value ? "opacity-100" : "opacity-0")} />
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



export { ButtonClickPanelCodeLanguage };



export type { ButtonClickPanelCodeLanguageItem, ButtonClickPanelCodeLanguageProps };
