"use client";
import { BlockMenuPlugin } from "@platejs/selection/react";
import { BlockContextMenu } from "@/chip/ui/plate/block-context-menu";

const BlockMenuKit = [
  BlockMenuPlugin.configure({
    render: { aboveEditable: BlockContextMenu },
  }),
];

export { BlockMenuKit };
