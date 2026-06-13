"use client";

import { TableCellHeaderPlugin, TableCellPlugin, TablePlugin, TableRowPlugin } from "@platejs/table/react";

import { TableCellElement, TableCellHeaderElement, TableElement, TableRowElement } from "@/chip/ui/plate/table-node";

const TableKit = [
  TablePlugin.withComponent(TableElement),
  TableRowPlugin.withComponent(TableRowElement),
  TableCellPlugin.withComponent(TableCellElement),
  TableCellHeaderPlugin.withComponent(TableCellHeaderElement),
];

export { TableKit };
