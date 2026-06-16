"use client";

import { cn } from "@web-renderer/lib/utils";
import type { PlateElementProps, PlateTextProps } from "platejs/react";
import { PlateElement, PlateText } from "platejs/react";

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
      <div className="h-px" />
    </PlateElement>
  );
};

export { AILeaf, AIAnchorElement };
