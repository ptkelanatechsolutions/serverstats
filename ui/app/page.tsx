"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, Cpu, Monitor, MemoryStick, HardDrive, Wifi } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StatCard } from "@/components/StatCard";
import { CpuCard } from "@/components/CpuCard";
import { GpuCard } from "@/components/GpuCard";
import { RamCard } from "@/components/RamCard";
import { DiskCard } from "@/components/DiskCard";
import { NetworkCard } from "@/components/NetworkCard";
import { ProcessTable } from "@/components/ProcessTable";
import type { SystemInfo } from "@/lib/data";

export default function Home() {
  const [data, setData] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as SystemInfo;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  useEffect(() => {
    // The setState in an async effect is safe — the fetch is non-blocking.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const iconClass = "h-4 w-4 text-muted-foreground";

  // Loading state
  if (!data && !error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Activity className="h-8 w-8 text-primary animate-pulse mx-auto" />
          <p className="text-muted-foreground">Connecting to server...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!data && error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <Activity className="h-8 w-8 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold">Connection Error</h2>
          <p className="text-sm text-muted-foreground break-words">{error}</p>
          <button
            onClick={fetchStats}
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <Activity className="h-6 w-6 text-primary shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold truncate">{data!.hostname}</h1>
          </div>
          <ThemeToggle />
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard title="CPU" icon={<Cpu className={iconClass} />}>
            <CpuCard cpu={data!.cpu} />
          </StatCard>
          <StatCard title="GPU" icon={<Monitor className={iconClass} />}>
            <GpuCard gpu={data!.gpu} />
          </StatCard>
          <StatCard title="RAM" icon={<MemoryStick className={iconClass} />}>
            <RamCard ram={data!.ram} />
          </StatCard>
          <StatCard
            title="DISK"
            icon={<HardDrive className={iconClass} />}
            className="lg:col-span-2"
          >
            <DiskCard disks={data!.disks} />
          </StatCard>
          <StatCard title="NETWORK" icon={<Wifi className={iconClass} />}>
            <NetworkCard network={data!.network} />
          </StatCard>
        </div>

        {/* Process Table */}
        <ProcessTable processes={data!.processes} />
      </div>
    </div>
  );
}
