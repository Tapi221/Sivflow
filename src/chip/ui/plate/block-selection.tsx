"use client";

import { cva } from "class-variance-authority";

const blockSelectionVariants = cva("pointer-events-none absolute inset-0 z-1 bg-brand/[.13] transition-opacity");

const BlockSelection = () => null;

export { BlockSelection, blockSelectionVariants };
