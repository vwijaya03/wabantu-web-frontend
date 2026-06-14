"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Tabel konsisten untuk seluruh modul Persediaan (padding, header, hover). */
export function InventoryTable({
  className,
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return <Table className={cn(className)}>{children}</Table>;
}

export const InventoryTableHeader = TableHeader;
export const InventoryTableBody = TableBody;
export const InventoryTableRow = TableRow;

export function InventoryTableHead({
  className,
  children,
  align = "left",
}: React.PropsWithChildren<{
  className?: string;
  align?: "left" | "right" | "center";
}>) {
  return (
    <TableHead
      className={cn(
        "uppercase tracking-wide",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

export function InventoryTableCell({
  className,
  children,
  align = "left",
  ...props
}: React.ComponentProps<typeof TableCell> & { align?: "left" | "right" | "center" }) {
  return (
    <TableCell
      className={cn(
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    >
      {children}
    </TableCell>
  );
}

export function InventoryTableEmpty({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}
