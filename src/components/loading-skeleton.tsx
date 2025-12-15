import { cn } from "@/lib/utils";

export function LoadingSpinner({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    default: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-primary border-t-transparent",
        sizeClasses[size]
      )}
    />
  );
}

export function TableRowSkeleton({ columns = 7 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted/50 rounded w-3/4" />
            {i === 0 && <div className="h-3 bg-muted/30 rounded w-1/2" />}
          </div>
        </td>
      ))}
    </tr>
  );
}

export function LoadingState({ message = "جاري التحميل..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <LoadingSpinner size="lg" />
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">يرجى الانتظار لحظة</p>
      </div>
    </div>
  );
}
