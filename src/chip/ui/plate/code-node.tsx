"use client";

import type { PlateLeafProps } from "platejs/react";

import { PlateLeaf } from "platejs/react";



const CodeLeaf = (props: PlateLeafProps) => (
  <PlateLeaf
    {...props}
    as="code"
    className="whitespace-pre-wrap rounded-md bg-muted px-1 py-0.5 font-mono text-sm"
  >
    {props.children}
  </PlateLeaf>
);



export { CodeLeaf };
