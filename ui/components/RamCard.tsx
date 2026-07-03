import { Progress } from "@/components/ui/Progress";
import { formatBytes, getUsageTextColor, cn } from "@/lib/utils";
import type { RAMInfo } from "@/lib/data";

interface RamCardProps {
  ram: RAMInfo;
}

export function RamCard({ ram }: RamCardProps) {
  return (
    <div className="space-y-4">
      {/* Big Percentage */}
      <div className="flex items-baseline justify-between">
        <span
          className={cn("text-4xl font-bold tracking-tight", getUsageTextColor(ram.percentage))}
        >
          {ram.percentage}%
        </span>
        <span className="text-xs text-muted-foreground">utilized</span>
      </div>

      {/* Usage Bar */}
      <Progress value={ram.percentage} color="auto" size="lg" showLabel />

      {/* Total / Used / Free */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        <div className="flex flex-col items-center gap-1 rounded-md bg-muted/50 p-2">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-sm font-medium tabular-nums">
            {formatBytes(ram.total * 1024 ** 3)}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-md bg-muted/50 p-2">
          <span className="text-xs text-muted-foreground">Used</span>
          <span
            className={cn("text-sm font-medium tabular-nums", getUsageTextColor(ram.percentage))}
          >
            {formatBytes(ram.used * 1024 ** 3)}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-md bg-muted/50 p-2">
          <span className="text-xs text-muted-foreground">Free</span>
          <span className="text-sm font-medium tabular-nums text-green-500">
            {formatBytes(ram.free * 1024 ** 3)}
          </span>
        </div>
      </div>
    </div>
  );
}
