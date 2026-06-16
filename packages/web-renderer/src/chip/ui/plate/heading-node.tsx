"use client";

import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";

const headingVariants = cva(
  "relative mb-1 data-[nav-target=true]:rounded-md data-[nav-target=true]:bg-(--color-highlight)",
  {
    variants: {
      variant: {
        h1: "mt-8 pb-1 font-bold font-heading text-4xl",
        h2: "mt-7 pb-px font-heading font-semibold text-2xl tracking-tight",
        h3: "mt-5 pb-px font-heading font-semibold text-xl tracking-tight",
        h4: "mt-3 font-heading font-semibold text-lg tracking-tight",
        h5: "mt-3 font-semibold text-lg tracking-tight",
        h6: "mt-3 font-semibold text-base tracking-tight",
      },
    },
  },
);

const HeadingElement = ({ variant = "h1", ...props }: PlateElementProps & VariantProps<typeof headingVariants>) => {
  return (
    <PlateElement as={variant!} className={headingVariants({ variant })} {...props}>
      {props.children}
    </PlateElement>
  );
};
const H1Element = (props: PlateElementProps) => <HeadingElement variant="h1" {...props} />;
const H2Element = (props: PlateElementProps) => <HeadingElement variant="h2" {...props} />;
const H3Element = (props: PlateElementProps) => <HeadingElement variant="h3" {...props} />;
const H4Element = (props: PlateElementProps) => <HeadingElement variant="h4" {...props} />;
const H5Element = (props: PlateElementProps) => <HeadingElement variant="h5" {...props} />;
const H6Element = (props: PlateElementProps) => <HeadingElement variant="h6" {...props} />;

export { HeadingElement, H1Element, H2Element, H3Element, H4Element, H5Element, H6Element };
