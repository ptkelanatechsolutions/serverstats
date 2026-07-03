import { Thermometer, Gauge, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { formatGhz, formatCelsius, getUsageTextColor, cn } from "@/lib/utils";
import type { GPUInfo } from "@/lib/data";

interface GpuCardProps {
  gpu: GPUInfo;
}

export function GpuCard({ gpu }: GpuCardProps) {
  const vramPercent = Math.round((gpu.vramUsed / gpu.vramTotal) * 100);

  return (
    <div className="space-y-4">
      {/* GPU Name */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate" title={gpu.name}>
          {gpu.name}
        </span>
        <Badge className={cn("shrink-0", getUsageTextColor(gpu.temperature))}>
          <Thermometer className="h-3 w-3 mr-1" />
          {formatCelsius(gpu.temperature)}
        </Badge>
      </div>

      {/* Usage */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Usage</span>
          <span className={cn("font-semibold", getUsageTextColor(gpu.usage))}>{gpu.usage}%</span>
        </div>
        <Progress value={gpu.usage} color="auto" />
      </div>

      {/* VRAM */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">VRAM ({gpu.vramTotal} GB)</span>
          <span className="font-medium tabular-nums">
            {gpu.vramUsed} / {gpu.vramTotal} GB
          </span>
        </div>
        <Progress value={vramPercent} color="auto" />
      </div>

      {/* Core Clock + Memory Clock */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="flex flex-col items-center gap-1 rounded-md bg-muted/50 p-2">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Core Clock</span>
          <span className="text-sm font-medium">{formatGhz(gpu.coreClock)}</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-md bg-muted/50 p-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Mem Clock</span>
          <span className="text-sm font-medium">{formatGhz(gpu.memoryClock)}</span>
        </div>
      </div>
    </div>
  );
}
