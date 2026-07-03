import { ArrowDown, ArrowUp, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { formatSpeed } from "@/lib/utils";
import type { NetworkInfo } from "@/lib/data";

interface NetworkCardProps {
  network: NetworkInfo;
}

export function NetworkCard({ network }: NetworkCardProps) {
  const downloadPercent = Math.round((network.downloadSpeed / network.downloadMax) * 100);
  const uploadPercent = Math.round((network.uploadSpeed / network.uploadMax) * 100);

  return (
    <div className="space-y-4">
      {/* Interface name */}
      <div className="flex items-center gap-2">
        <Wifi className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{network.interfaceName}</span>
        <Badge variant="outline" className="ml-auto text-xs">
          Connected
        </Badge>
      </div>

      {/* Download */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <ArrowDown className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">Download</span>
          </div>
          <span className="font-semibold tabular-nums">{formatSpeed(network.downloadSpeed)}</span>
        </div>
        <Progress value={downloadPercent} color="auto" />
      </div>

      {/* Upload */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <ArrowUp className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Upload</span>
          </div>
          <span className="font-semibold tabular-nums">{formatSpeed(network.uploadSpeed)}</span>
        </div>
        <Progress value={uploadPercent} color="auto" />
      </div>
    </div>
  );
}
