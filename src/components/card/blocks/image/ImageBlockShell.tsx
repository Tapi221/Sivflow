import React from "react";
import { cn } from "@web-renderer/lib/utils";
import { BlockInset } from "@/components/card/blocks/editor/BlockInset";



type ImageBlockShellProps = {
  children: React.ReactNode;
  className?: string;
};



const ImageBlockShell = ({ children, className }: ImageBlockShellProps) => {
  return (<BlockInset variant="image"> <div className={cn("relative rounded-xl overflow-hidden", className)}> {children} </div> </BlockInset>);
};



export { ImageBlockShell };
