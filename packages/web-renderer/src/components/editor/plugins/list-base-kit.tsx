import { BaseListPlugin, isOrderedList } from "@platejs/list";
import { BlockListStatic } from "@web-renderer/chip/ui/plate/block-list-static";
import { BaseIndentKit } from "@web-renderer/components/editor/plugins/indent-base-kit";
import { KEYS } from "platejs";

const BaseListKit = [
  ...BaseIndentKit,
  BaseListPlugin.configure({
    inject: {
      nodeProps: {
        nodeKey: KEYS.listType,
        query: ({ nodeProps }) => {
          const element = nodeProps.element;
          return !!element?.listStyleType && !isOrderedList(element);
        },
        transformProps: ({ props }) => ({
          ...props,
          role: "listitem",
          style: {
            ...props.style,
            display: "list-item",
          },
        }),
      },
      targetPlugins: [
        ...KEYS.heading,
        KEYS.p,
        KEYS.blockquote,
        KEYS.codeBlock,
        KEYS.toggle,
      ],
    },
    render: {
      belowNodes: BlockListStatic,
    },
  }),
];

export { BaseListKit };
