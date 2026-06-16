"use client";

import * as React from "react";
import { Toolbar } from "@web-renderer/chip/ui/plate/toolbar";
import { cn } from "@web-renderer/lib/utils";

const FixedToolbar = (props: React.ComponentProps<typeof Toolbar>) => {
  return (
    <Toolbar
      {...props}
      className={cn(
        "scrollbar-hide sticky top-0 left-0 z-50 w-full justify-between overflow-x-auto rounded-t-lg border-b border-b-border bg-background/95 p-1 backdrop-blur-sm supports-backdrop-blur:bg-background/60",
        props.className,
      )}
    />
  );
};

export { FixedToolbar };
