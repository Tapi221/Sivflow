import { BaseColumnItemPlugin, BaseColumnPlugin } from "@platejs/layout";
import { ColumnElementStatic, ColumnGroupElementStatic } from "@/chip/ui/node/column-node-static";

const BaseColumnKit = [BaseColumnPlugin.withComponent(ColumnGroupElementStatic), BaseColumnItemPlugin.withComponent(ColumnElementStatic)];

export { BaseColumnKit };
