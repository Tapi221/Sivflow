"use client";

import type { TDateElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";

const DateElement = (props: PlateElementProps<TDateElement>) => {
  const { element } = props;
  return (
    <PlateElement {...props} className="inline-block">
      <span contentEditable={false}>{element.date ?? element.rawDate ?? "Pick a date"}</span>
      {props.children}
    </PlateElement>
  );
};

export { DateElement };
