export interface CPUInfo {
  name: string;
  load: number;
  temperature: number;
  cores: number;
  threads: number;
  cache: string;
}

export interface GPUInfo {
  name: string;
  vramTotal: number;
  vramUsed: number;
  temperature: number;
  coreClock: number;
  memoryClock: number;
  usage: number;
}

export interface RAMInfo {
  total: number;
  used: number;
  free: number;
  percentage: number;
}

export interface DiskInfo {
  partition: string;
  total: number;
  used: number;
  free: number;
  percentage: number;
  filesystem: string;
}

export interface NetworkInfo {
  interfaceName: string;
  downloadSpeed: number;
  uploadSpeed: number;
  downloadMax: number;
  uploadMax: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  networkUsage: number;
  gpuUsage: number;
  user: string;
}

export interface SystemInfo {
  hostname: string;
  cpu: CPUInfo;
  gpu: GPUInfo;
  ram: RAMInfo;
  disks: DiskInfo[];
  network: NetworkInfo;
  processes: ProcessInfo[];
}

// Real data collected server-side via /api/stats
// This file only exports types for type-safety across components.
