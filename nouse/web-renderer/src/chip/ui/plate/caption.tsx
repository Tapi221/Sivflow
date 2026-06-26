"use client";

import * as React from "react";

import { Caption as CaptionPrimitive, CaptionTextarea as CaptionTextareaPrimitive, useCaptionButton, useCaptionButtonState } from "@platejs/caption/react";

import { createPrimitiveComponent } from "@udecode/cn";

import { Button } from "@web-renderer/chip/button/button/button";

import { cn } from "@web-renderer/lib/utils";

import type { VariantProps } from "class-variance-authority";

import { cva } from "class-variance-authority";



const captionVariants = cva("max-w-full", {
  defaultVariants: {
    align: "center",
  },
  variants: {
    align: {
      center: "mx-auto",
      left: "mr-auto",
      right: "ml-auto",
    },
  },
});

const CaptionButton = createPrimitiveComponent(Button)({
  propsHook: useCaptionButton,
  stateHook: useCaptionButtonState,
});



const Caption = ({ align, className, ...props }: React.ComponentProps<typeof CaptionPrimitive> & VariantProps<typeof captionVariants>) => {
  return <CaptionPrimitive {...props} className={cn(captionVariants({ align }), className)} />;
};

const CaptionTextarea = (props: React.ComponentProps<typeof CaptionTextareaPrimitive>) => {
  return (
    <CaptionTextareaPrimitive
      {...props}
      className={cn(
        "mt-2 w-full resize-none border-none bg-inherit p-0 font-[inherit] text-inherit",
        "focus:outline-none focus:[&::placeholder]:opacity-0",
        "text-center print:placeholder:text-transparent",
        props.className,
      )}
    />
  );
};



export { Caption, CaptionTextarea, CaptionButton };
