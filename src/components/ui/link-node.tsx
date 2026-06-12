"use client";

import * as React from "react";
import { getLinkAttributes } from "@platejs/link";
import type { TLinkElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";
import { inlineSuggestionVariants } from "@/lib/suggestion";
import { cn } from "@/lib/utils";

const LinkElement = (props: PlateElementProps<TLinkElement>) => {
  return (<PlateElement {...props} as="a" className={cn("font-medium text-primary underline decoration-primary underline-offset-4", inlineSuggestionVariants())} attributes={{ ...props.attributes, ...getLinkAttributes(props.editor, props.element), onMouseOver: (event) => {
    event.stopPropagation();
  },
  }}
  >
    {props.children}
  </PlateElement>
  );
};

export { LinkElement };
