import { BaseTableCellHeaderPlugin, BaseTableCellPlugin, BaseTablePlugin, BaseTableRowPlugin } from "@platejs/table";
import { TableCellElementStatic, TableCellHeaderElementStatic, TableElementStatic, TableRowElementStatic } from "@web-renderer/chip/ui/plate/table-node-static";

const BaseTableKit = [BaseTablePlugin.withComponent(TableElementStatic), BaseTableRowPlugin.withComponent(TableRowElementStatic), BaseTableCellPlugin.withComponent(TableCellElementStatic), BaseTableCellHeaderPlugin.withComponent(TableCellHeaderElementStatic)];

export { BaseTableKit };
