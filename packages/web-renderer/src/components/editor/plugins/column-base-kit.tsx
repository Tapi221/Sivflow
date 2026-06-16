import { BaseColumnItemPlugin, BaseColumnPlugin } from "@platejs/layout";
import { ColumnElementStatic, ColumnGroupElementStatic } from "@web-renderer/chip/ui/plate/column-node-static";



const BaseColumnKit = [
  BaseColumnPlugin.withComponent(ColumnGroupElementStatic),
  BaseColumnItemPlugin.withComponent(ColumnElementStatic),
];



export { BaseColumnKit };
