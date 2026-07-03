"use client";

import { cn, getUsageColor, clamp } from "@/lib/utils";

interface ProgressProps {
  value: number;
  className?: string;
  color?: "auto" | "green" | "yellow" | "red" | "primary";
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
}

export function Progress({
  value,
  className,
  color = "auto",
  size = "default",
  showLabel = false,
}: ProgressProps) {
  const clamped = clamp(isNaN(value) ? 0 : value, 0, 100);

  const sizeClasses = {
    sm: "h-1.5",
    default: "h-2",
    lg: "h-3",
  };

  const colorClass =
    color === "auto"
      ? getUsageColor(clamped)
      : color === "green"
        ? "bg-green-500"
        : color === "yellow"
          ? "bg-yellow-500"
          : color === "red"
            ? "bg-red-500"
            : "bg-primary";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn("flex-1 rounded-full bg-muted overflow-hidden", sizeClasses[size])}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", colorClass)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-mono tabular-nums text-muted-foreground min-w-[3ch] text-right">
          {clamped}%
        </span>
      )}
    </div>
  );
}
