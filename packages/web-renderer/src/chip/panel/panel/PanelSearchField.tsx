import { Search } from "@web-renderer/chip/icons";
import { Input } from "@web-renderer/chip/input-field/input";
import { cn } from "@web-renderer/lib/utils";
import type { Ref } from "react";



interface PanelSearchFieldProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
  inputClassName?: string;
}



const PanelSearchField = ({ value, placeholder = "検索...", onChange, inputRef, className, inputClassName }: PanelSearchFieldProps) => {
  return (<div className={cn("relative", className)}> <Search className="ds-filter-search-icon pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" /> <Input ref={inputRef} type="text" className={cn("ds-filter-search surface-concave w-full pl-10 pr-3", inputClassName)} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /> </div>);
};



export { PanelSearchField };
