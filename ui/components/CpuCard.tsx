import { Cpu, Thermometer, Layers } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { formatCelsius, getUsageTextColor, cn } from "@/lib/utils";
import type { CPUInfo } from "@/lib/data";

interface CpuCardProps {
  cpu: CPUInfo;
}

export function CpuCard({ cpu }: CpuCardProps) {
  return (
    <div className="space-y-4">
      {/* CPU Name + Temp Badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate" title={cpu.name}>
          {cpu.name}
        </span>
        <Badge className={cn("shrink-0", getUsageTextColor(cpu.temperature))}>
          <Thermometer className="h-3 w-3 mr-1" />
          {formatCelsius(cpu.temperature)}
        </Badge>
      </div>

      {/* Load */}
      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <span className={cn("text-3xl font-bold tracking-tight", getUsageTextColor(cpu.load))}>
            {cpu.load}%
          </span>
          <span className="text-xs text-muted-foreground">used</span>
        </div>
        <Progress value={cpu.load} color="auto" size="lg" />
      </div>

      {/* Cores / Threads / Cache */}
      <div className="grid grid-cols-3 gap-4 pt-1">
        <div className="flex flex-col items-center gap-1">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Cores</span>
          <span className="text-sm font-medium">{cpu.cores}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Cpu className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Threads</span>
          <span className="text-sm font-medium">{cpu.threads}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Cache</span>
          <span className="text-sm font-medium truncate max-w-full" title={cpu.cache}>
            {cpu.cache}
          </span>
        </div>
      </div>
    </div>
  );
}
