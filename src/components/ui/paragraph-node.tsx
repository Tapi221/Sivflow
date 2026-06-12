"use client";

import * as React from "react";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";
import { cn } from "@/lib/utils";

const ParagraphElement = (props: PlateElementProps) => {
  return (<PlateElement {...props} className={cn("m-0 px-0 py-1")}> {props.children} </PlateElement>);
};

export { ParagraphElement };
