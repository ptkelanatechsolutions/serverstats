"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getUsageColor, formatBytes, cn } from "@/lib/utils";
import type { ProcessInfo } from "@/lib/data";

type SortKey = "cpu" | "ram" | "disk" | "network" | "gpu";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "cpu", label: "CPU" },
  { key: "ram", label: "RAM" },
  { key: "disk", label: "DISK" },
  { key: "network", label: "NETWORK" },
  { key: "gpu", label: "GPU" },
];

function getFieldName(key: SortKey): keyof ProcessInfo {
  const map: Record<SortKey, keyof ProcessInfo> = {
    cpu: "cpuUsage",
    ram: "ramUsage",
    disk: "diskUsage",
    network: "networkUsage",
    gpu: "gpuUsage",
  };
  return map[key];
}

function getMaxForField(key: SortKey): number {
  const maxes: Record<SortKey, number> = {
    cpu: 100,
    ram: 16384,
    disk: 200,
    network: 100,
    gpu: 100,
  };
  return maxes[key];
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full", getUsageColor(pct))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono tabular-nums w-[5ch] text-right shrink-0">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

interface ProcessTableProps {
  processes: ProcessInfo[];
}

export function ProcessTable({ processes }: ProcessTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("cpu");
  const [expandedPid, setExpandedPid] = useState<number | null>(null);

  const field = getFieldName(sortKey);
  const max = getMaxForField(sortKey);

  const sorted = [...processes]
    .sort((a, b) => (b[field] as number) - (a[field] as number))
    .slice(0, 10);

  const selectedLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? "CPU";

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Top Processes</CardTitle>
          <div className="flex gap-1 overflow-x-auto -mx-1 px-1">
            {SORT_OPTIONS.map((opt) => (
              <Button
                key={opt.key}
                variant={sortKey === opt.key ? "default" : "outline"}
                size="sm"
                onClick={() => setSortKey(opt.key)}
                className="shrink-0"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {processes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No process data available
          </p>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase border-b border-border">
                    <th className="text-left font-medium py-2 pr-2">PID</th>
                    <th className="text-left font-medium py-2 pr-2">Name</th>
                    <th className="text-left font-medium py-2 pr-2">User</th>
                    <th className="text-left font-medium py-2 pr-2">CPU</th>
                    <th className="text-left font-medium py-2 pr-2">RAM</th>
                    <th className="text-left font-medium py-2 pr-2">DISK</th>
                    <th className="text-left font-medium py-2 pr-2">NET</th>
                    <th className="text-left font-medium py-2">GPU</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p, i) => (
                    <tr
                      key={p.pid}
                      className={cn(
                        "border-b border-border last:border-b-0 transition-colors hover:bg-muted/30",
                        i === 0 && "font-medium",
                      )}
                    >
                      <td className="py-2.5 pr-2 text-xs text-muted-foreground tabular-nums">
                        {p.pid}
                      </td>
                      <td className="py-2.5 pr-2 text-sm max-w-[140px] truncate" title={p.name}>
                        {p.name}
                      </td>
                      <td className="py-2.5 pr-2 text-xs text-muted-foreground">{p.user}</td>
                      <td className="py-2.5 pr-2">
                        <MiniBar value={p.cpuUsage} max={100} />
                      </td>
                      <td className="py-2.5 pr-2">
                        <MiniBar value={p.ramUsage} max={max} />
                      </td>
                      <td className="py-2.5 pr-2">
                        <MiniBar value={p.diskUsage} max={200} />
                      </td>
                      <td className="py-2.5 pr-2">
                        <MiniBar value={p.networkUsage} max={100} />
                      </td>
                      <td className="py-2.5">
                        <MiniBar value={p.gpuUsage} max={100} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2">
              {sorted.map((p) => (
                <button
                  key={p.pid}
                  onClick={() => setExpandedPid(expandedPid === p.pid ? null : p.pid)}
                  className="w-full text-left rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
                >
                  {/* Top row: name + pid + primary metric */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground tabular-nums">{p.pid}</span>
                      <span className="text-sm font-medium truncate">{p.name}</span>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-bold tabular-nums shrink-0 ml-2",
                        selectedLabel === "CPU" &&
                          getUsageColor(p.cpuUsage).replace("bg-", "text-"),
                        selectedLabel === "RAM" &&
                          getUsageColor(Math.min(100, (p.ramUsage / 16384) * 100)).replace(
                            "bg-",
                            "text-",
                          ),
                        selectedLabel === "DISK" &&
                          getUsageColor(Math.min(100, (p.diskUsage / 200) * 100)).replace(
                            "bg-",
                            "text-",
                          ),
                        selectedLabel === "NETWORK" &&
                          getUsageColor(Math.min(100, p.networkUsage)).replace("bg-", "text-"),
                        selectedLabel === "GPU" &&
                          getUsageColor(p.gpuUsage).replace("bg-", "text-"),
                      )}
                    >
                      {(p[field] as number).toFixed(1)}
                    </span>
                  </div>

                  {/* Active filter bar */}
                  <MiniBar value={p[field] as number} max={max} />

                  {/* Expand for more details */}
                  {expandedPid === p.pid && (
                    <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">User: </span>
                        {p.user}
                      </div>
                      <div>
                        <span className="text-muted-foreground">CPU: </span>
                        {p.cpuUsage}%
                      </div>
                      <div>
                        <span className="text-muted-foreground">RAM: </span>
                        {formatBytes(p.ramUsage * 1024 * 1024)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">DISK: </span>
                        {p.diskUsage} MB/s
                      </div>
                      <div>
                        <span className="text-muted-foreground">NET: </span>
                        {p.networkUsage} KB/s
                      </div>
                      <div>
                        <span className="text-muted-foreground">GPU: </span>
                        {p.gpuUsage}%
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Showing top 10 processes sorted by {selectedLabel} usage. Tap a process on mobile for
              details.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
