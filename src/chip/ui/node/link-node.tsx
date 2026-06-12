"use client";

import { getLinkAttributes } from "@platejs/link";
import type { TLinkElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";
import type { MouseEvent } from "react";
import { inlineSuggestionVariants } from "@/lib/suggestion";
import { cn } from "@/lib/utils";

const LINK_ELEMENT_CLASS_NAME = "font-medium text-inherit underline decoration-current underline-offset-4";

const LinkElement = (props: PlateElementProps<TLinkElement>) => {
  const { attributes, children, editor, element } = props;

  return (
    <PlateElement
      {...props}
      as="a"
      className={cn(LINK_ELEMENT_CLASS_NAME, inlineSuggestionVariants())}
      attributes={{
        ...attributes,
        ...getLinkAttributes(editor, element),
        onMouseOver: (event: MouseEvent<HTMLAnchorElement>) => {
          event.stopPropagation();
        },
      }}
    >
      {children}
    </PlateElement>
  );
};

export { LinkElement };
