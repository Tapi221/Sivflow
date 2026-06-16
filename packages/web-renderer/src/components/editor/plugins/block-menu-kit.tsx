"use client";

import { BlockMenuPlugin } from "@platejs/selection/react";

import { BlockContextMenu } from "@web-renderer/chip/ui/plate/block-context-menu";



const BlockMenuKit = [
  BlockMenuPlugin.configure({
    render: { aboveEditable: BlockContextMenu },
  }),
];



export { BlockMenuKit };
