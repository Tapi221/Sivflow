"use client";

import { ColumnItemPlugin, ColumnPlugin } from "@platejs/layout/react";

import { ColumnElement, ColumnGroupElement } from "@/chip/ui/plate/column-node";



const ColumnKit = [
  ColumnPlugin.withComponent(ColumnGroupElement),
  ColumnItemPlugin.withComponent(ColumnElement),
];



export { ColumnKit };
