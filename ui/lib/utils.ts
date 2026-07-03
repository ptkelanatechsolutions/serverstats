export function cn(...classes: (string | boolean | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getUsageColor(value: number): string {
  if (value < 60) return "bg-green-500";
  if (value < 85) return "bg-yellow-500";
  return "bg-red-500";
}

export function getUsageTextColor(value: number): string {
  if (value < 60) return "text-green-500";
  if (value < 85) return "text-yellow-500";
  return "text-red-500";
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function formatSpeed(mbps: number): string {
  if (!mbps || mbps <= 0) return "0 Mbps";
  if (mbps < 1) return `${(mbps * 1000).toFixed(0)} Kbps`;
  return `${mbps.toFixed(0)} Mbps`;
}

export function formatCelsius(c: number): string {
  return `${Math.round(c)}°C`;
}

export function formatGhz(mhz: number): string {
  if (mhz >= 1000) {
    return `${(mhz / 1000).toFixed(1)} GHz`;
  }
  return `${mhz} MHz`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
