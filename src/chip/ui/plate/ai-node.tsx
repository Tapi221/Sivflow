"use client";

import type { PlateElementProps, PlateTextProps } from "platejs/react";

import { PlateElement, PlateText } from "platejs/react";

import { cn } from "@/lib/utils";



const AILeaf = (props: PlateTextProps) => {
  return (
    <PlateText
      className={cn("border-b-2 border-b-purple-100 bg-purple-50 text-purple-800")}
      {...props}
    />
  );
};

const AIAnchorElement = (props: PlateElementProps) => {
  return (
    <PlateElement {...props}>
      <div className="h-[0.1px]" />
    </PlateElement>
  );
};



export { AILeaf, AIAnchorElement };
