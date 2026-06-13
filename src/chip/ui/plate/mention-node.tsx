"use client";

import type { TComboboxInputElement, TMentionElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";

const MentionElement = (props: PlateElementProps<TMentionElement> & { prefix?: string }) => {
  const { element } = props;
  return (
    <PlateElement {...props} className="inline-block rounded-md bg-muted px-1.5 py-0.5 align-baseline font-medium text-sm">
      {props.prefix}
      {element.value}
      {props.children}
    </PlateElement>
  );
};
const MentionInputElement = (props: PlateElementProps<TComboboxInputElement>) => {
  return <PlateElement {...props} as="span" />;
};

export { MentionElement, MentionInputElement };
