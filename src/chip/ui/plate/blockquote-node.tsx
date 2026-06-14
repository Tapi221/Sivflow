"use client";

import type { PlateElementProps } from "platejs/react";

import { PlateElement } from "platejs/react";



const BlockquoteElement = (props: PlateElementProps) => {
  return <PlateElement as="blockquote" className="my-1 border-l-2 pl-6 italic" {...props} />;
};



export { BlockquoteElement };
