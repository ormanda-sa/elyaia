 "use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TableProps extends React.ComponentProps<"table"> {}
interface TableHeaderProps extends React.ComponentProps<"thead"> {}
interface TableBodyProps extends React.ComponentProps<"tbody"> {}
interface TableRowProps extends React.ComponentProps<"tr"> {}

// هنا نضيف isHeader
type TableCellProps = React.ComponentProps<"td"> & {
  isHeader?: boolean;
};

export function Table({ className, ...props }: TableProps) {
  return (
    <div className="relative w-full overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/60">
      <table
        className={cn(
          "min-w-full text-xs text-right text-slate-800",
          className
        )}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: TableHeaderProps) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-10 bg-slate-100/90 text-[11px] text-slate-600 backdrop-blur",
        className
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: TableBodyProps) {
  return (
    <tbody
      className={cn("divide-y divide-slate-100 bg-white/80", className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-slate-50/80 data-[state=selected]:bg-slate-100",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  isHeader = false,
  children,
  ...props
}: TableCellProps) {
  const Comp: "td" | "th" = isHeader ? "th" : "td";

  return (
    <Comp
      data-slot="table-cell"
      className={cn(
        "px-3 py-2 align-middle whitespace-nowrap",
        isHeader && "font-medium text-slate-700",
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}
