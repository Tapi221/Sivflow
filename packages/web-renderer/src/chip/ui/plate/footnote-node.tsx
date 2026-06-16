"use client";

import type { TFootnoteElement } from "@platejs/footnote";

import { cn } from "@web-renderer/lib/utils";

import type { PlateElementProps } from "platejs/react";

import { PlateElement } from "platejs/react";



const FootnoteReferenceElement = (props: PlateElementProps<TFootnoteElement>) => {
  const identifier = props.element.identifier ?? "";
  return (
    <PlateElement {...props} as="sup" className="group/footnote-ref mx-0.5 align-super" attributes={{ ...props.attributes, contentEditable: false }}>
      {props.children}
      <span className={cn("rounded-xs font-medium text-primary text-xs")}>[{identifier}]</span>
    </PlateElement>
  );
};

const FootnoteDefinitionElement = (props: PlateElementProps<TFootnoteElement>) => {
  const identifier = props.element.identifier ?? "";
  return (
    <PlateElement {...props} className="mt-1.5 flex items-start gap-1.5">
      <div contentEditable={false} className="min-w-3 text-muted-foreground text-xs tabular-nums">
        {identifier}
      </div>
      <div className="min-w-0 flex-1">{props.children}</div>
    </PlateElement>
  );
};

const FootnoteInputElement = (props: PlateElementProps) => {
  return <PlateElement {...props} as="span" />;
};



export { FootnoteReferenceElement, FootnoteDefinitionElement, FootnoteInputElement };
