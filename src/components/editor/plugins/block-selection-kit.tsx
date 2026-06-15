"use client";
import { AIChatPlugin } from "@platejs/ai/react";
import { BlockSelectionPlugin } from "@platejs/selection/react";
import { getPluginTypes, isHotkey, KEYS } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { BlockSelection } from "@/chip/ui/plate/block-selection";

const BlockSelectionKit = [
  BlockSelectionPlugin.configure(({ editor }) => ({
    options: {
      enableContextMenu: true,
      isSelectable: (element) =>
        !getPluginTypes(editor, [KEYS.column, KEYS.codeLine, KEYS.td]).includes(
          element.type,
        ),
      onKeyDownSelecting: (editor, event) => {
        if (isHotkey("mod+j")(event)) {
          editor.getApi(AIChatPlugin).aiChat.show();
        }
      },
    },
    render: {
      belowRootNodes: (props) => <BlockSelection {...(props as PlateElementProps)} />,
    },
  })),
];

export { BlockSelectionKit };
