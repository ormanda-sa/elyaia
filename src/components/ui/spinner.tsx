"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SpinnerProps = React.HTMLAttributes<HTMLDivElement>;

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("inline-flex items-center justify-center", className)}
      {...props}
    >
      <span className="h-4 w-4 animate-spin rounded-full border-[2px] border-muted-foreground/40 border-t-muted-foreground" />
    </div>
  );
}
