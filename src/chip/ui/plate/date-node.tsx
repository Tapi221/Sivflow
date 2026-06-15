"use client";

import type { TDateElement } from "platejs";

import type { PlateElementProps } from "platejs/react";

import { PlateElement } from "platejs/react";

import { cn } from "@/lib/utils";



const DateElement = (props: PlateElementProps<TDateElement>) => {
  const { element } = props;
  return (
    <PlateElement {...props} className="inline-block">
      <span className={cn("w-fit rounded-sm bg-muted px-1 text-muted-foreground")} contentEditable={false}>
        {element.date ?? element.rawDate ?? "Pick a date"}
      </span>
      {props.children}
    </PlateElement>
  );
};



export { DateElement };
