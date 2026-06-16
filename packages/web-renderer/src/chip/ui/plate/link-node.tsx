"use client";

import { getLinkAttributes } from "@platejs/link";
import { cn } from "@web-renderer/lib/utils";
import type { TLinkElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";

const LinkElement = (props: PlateElementProps<TLinkElement>) => {
  return (
    <PlateElement
      {...props}
      as="a"
      className={cn("font-medium text-primary underline decoration-primary underline-offset-4")}
      attributes={{
        ...props.attributes,
        ...getLinkAttributes(props.editor, props.element),
      }}
    >
      {props.children}
    </PlateElement>
  );
};

export { LinkElement };
