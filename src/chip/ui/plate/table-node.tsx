"use client";

import * as React from "react";

import type { TTableCellElement } from "platejs";

import type { PlateElementProps } from "platejs/react";

import { PlateElement } from "platejs/react";

import { cn } from "@/lib/utils";



const TableElement = (props: PlateElementProps) => {
  return (
    <PlateElement className="my-4 overflow-x-auto" {...props}>
      <table className="w-full table-fixed border-collapse">{props.children}</table>
    </PlateElement>
  );
};

const TableRowElement = (props: PlateElementProps) => {
  return <PlateElement as="tr" {...props} />;
};

const TableCellElement = (props: PlateElementProps<TTableCellElement>) => {
  return (
    <PlateElement
      as="td"
      className={cn("border border-border px-3 py-2 align-top")}
      {...props}
    />
  );
};

const TableCellHeaderElement = (props: PlateElementProps<TTableCellElement>) => {
  return (
    <PlateElement
      as="th"
      className={cn("border border-border bg-muted px-3 py-2 text-left align-top font-medium")}
      {...props}
    />
  );
};



export { TableElement, TableRowElement, TableCellElement, TableCellHeaderElement };
