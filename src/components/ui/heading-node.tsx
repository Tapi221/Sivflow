"use client";

import * as React from "react";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";

const headingVariants = cva(
  "relative mb-1 data-[nav-target=true]:rounded-md data-[nav-target=true]:bg-(--color-highlight)",
  {
    variants: {
      variant: {
        h1: "mt-[1.6em] pb-1 font-bold font-heading text-4xl",
        h2: "mt-[1.4em] pb-px font-heading font-semibold text-2xl tracking-tight",
        h3: "mt-[1em] pb-px font-heading font-semibold text-xl tracking-tight",
        h4: "mt-[0.75em] font-heading font-semibold text-lg tracking-tight",
        h5: "mt-[0.75em] font-semibold text-lg tracking-tight",
        h6: "mt-[0.75em] font-semibold text-base tracking-tight",
      },
    },
  },
);

const HeadingElement = ({ variant = "h1", ...props }: PlateElementProps & VariantProps<typeof headingVariants>) => {
  return (<PlateElement as={variant!} className={headingVariants({ variant })} {...props}> {props.children} </PlateElement>);
};
const H1Element = (props: PlateElementProps) => {
  return <HeadingElement variant="h1" {...props} />;
};
const H2Element = (props: PlateElementProps) => {
  return <HeadingElement variant="h2" {...props} />;
};
const H3Element = (props: PlateElementProps) => {
  return <HeadingElement variant="h3" {...props} />;
};
const H4Element = (props: PlateElementProps) => {
  return <HeadingElement variant="h4" {...props} />;
};
const H5Element = (props: PlateElementProps) => {
  return <HeadingElement variant="h5" {...props} />;
};
const H6Element = (props: PlateElementProps) => {
  return <HeadingElement variant="h6" {...props} />;
};

export { HeadingElement, H1Element, H2Element, H3Element, H4Element, H5Element, H6Element };
