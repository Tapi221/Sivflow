import { BaseTogglePlugin } from "@platejs/toggle";
import { ToggleElementStatic } from "@web-renderer/chip/ui/plate/toggle-node-static";

const BaseToggleKit = [
  BaseTogglePlugin.withComponent(ToggleElementStatic),
];

export { BaseToggleKit };
