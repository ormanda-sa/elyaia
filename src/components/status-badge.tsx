import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatusBadgeProps {
  icon?: LucideIcon;
  label: string | number;
  variant?: "blue" | "purple" | "green" | "orange" | "emerald" | "red";
  size?: "sm" | "default";
}

const variantClasses = {
  blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  purple: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  green: "bg-green-500/10 text-green-600 border-green-500/20",
  orange: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  red: "bg-red-500/10 text-red-600 border-red-500/20",
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-[11px]",
  default: "px-2.5 py-1 text-xs",
};

export function StatusBadge({ icon: Icon, label, variant = "blue", size = "default" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium border",
        variantClasses[variant],
        sizeClasses[size]
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  );
}
