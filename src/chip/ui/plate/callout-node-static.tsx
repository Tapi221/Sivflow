import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import { cn } from "@/lib/utils";



const CalloutElementStatic = (props: SlateElementProps) => {
  return <SlateElement className={cn("my-1 flex rounded-sm bg-muted p-4 pl-3")} {...props} />;
};



export { CalloutElementStatic };
