import { BaseLinkPlugin } from "@platejs/link";
import { LinkElementStatic } from "@web-renderer/chip/ui/plate/link-node-static";

const BaseLinkKit = [
  BaseLinkPlugin.withComponent(LinkElementStatic),
];

export { BaseLinkKit };
