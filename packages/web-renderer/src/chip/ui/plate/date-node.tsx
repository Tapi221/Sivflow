"use client";

import { cn } from "@web-renderer/lib/utils";

import type { TDateElement } from "platejs";

import type { PlateElementProps } from "platejs/react";

import { PlateElement } from "platejs/react";



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
