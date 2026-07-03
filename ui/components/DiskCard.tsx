import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { getUsageTextColor, formatBytes, cn } from "@/lib/utils";
import type { DiskInfo } from "@/lib/data";

interface DiskCardProps {
  disks: DiskInfo[];
}

export function DiskCard({ disks }: DiskCardProps) {
  if (!disks || disks.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No disk data available</p>;
  }

  return (
    <div className="divide-y divide-border">
      {disks.map((disk) => (
        <div key={disk.partition} className="py-3 first:pt-0 last:pb-0 space-y-2">
          {/* Header: Partition name + Filesystem badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{disk.partition}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {disk.filesystem}
              </Badge>
            </div>
            <span
              className={cn("text-sm font-bold tabular-nums", getUsageTextColor(disk.percentage))}
            >
              {disk.percentage}%
            </span>
          </div>

          {/* Progress bar */}
          <Progress value={disk.percentage} color="auto" />

          {/* Usage text */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatBytes(disk.used * 1024 ** 3)} used</span>
            <span>{formatBytes(disk.total * 1024 ** 3)} total</span>
          </div>
        </div>
      ))}
    </div>
  );
}
