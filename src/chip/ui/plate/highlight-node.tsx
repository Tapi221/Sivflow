"use client";

import type { PlateLeafProps } from "platejs/react";

import { PlateLeaf } from "platejs/react";

const HighlightLeaf = (props: PlateLeafProps) => {
  return <PlateLeaf {...props}>{props.children}</PlateLeaf>;
};

export { HighlightLeaf };
