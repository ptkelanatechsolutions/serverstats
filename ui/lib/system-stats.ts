import { execSync } from "node:child_process";
import { cpus, hostname, totalmem, freemem, platform } from "node:os";
import type {
  SystemInfo,
  CPUInfo,
  GPUInfo,
  RAMInfo,
  DiskInfo,
  NetworkInfo,
  ProcessInfo,
} from "./data";

// ---- Network speed tracking (module-level) ----
let prevNetStats: Record<string, { rx: number; tx: number }> | null = null;
let prevNetTime = 0;

// ---- Helpers ----

function isWindows() {
  return platform() === "win32";
}

function isLinux() {
  return platform() === "linux";
}

/** Run a command and return stdout (empty string on failure). */
function safeExec(cmd: string): string {
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      timeout: 4000,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    }).trim();
  } catch {
    return "";
  }
}

/** Run a PowerShell command — more reliable than wmic on modern Windows. */
function psCmd(script: string): string {
  return safeExec(`powershell -NoProfile -Command "${script}"`);
}

/** Parse PowerShell CSV output into rows of values. */
function parsePsCsv(output: string): string[][] {
  return output
    .split("\n")
    .slice(1) // skip header
    .map((line) =>
      line
        .trim()
        .split(",")
        .map((s) => s.replace(/^"|"$/g, "").trim()),
    )
    .filter((r) => r.length > 1 && r.some((v) => v.length > 0));
}

// ---- CPU ----

export function collectCpuInfo(): CPUInfo {
  const osCpus = cpus();
  const cores = osCpus.length;
  const model = osCpus[0]?.model ?? "Unknown CPU";

  // CPU load from times
  let totalIdle = 0;
  let totalTick = 0;
  for (const core of osCpus) {
    totalIdle += core.times.idle;
    totalTick +=
      core.times.user + core.times.nice + core.times.sys + core.times.idle + core.times.irq;
  }
  const load = totalTick > 0 ? parseFloat(((1 - totalIdle / totalTick) * 100).toFixed(1)) : 0;

  // Temperature
  let temperature = -1;
  if (isWindows()) {
    const tempOut = safeExec(
      "wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature /format:value 2>nul",
    );
    const match = tempOut.match(/CurrentTemperature=(\d+)/);
    if (match) temperature = Math.round(parseInt(match[1]) / 10 - 273.15);
  } else if (isLinux()) {
    const raw = safeExec("cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo 0");
    const millideg = parseInt(raw);
    temperature = millideg > 0 ? Math.round(millideg / 1000) : -1;
  }

  // Cache — best guess from CPU model
  let cache = "N/A";
  const ml = model.toLowerCase();
  if (ml.includes("epyc")) cache = "256 MB L3";
  else if (ml.includes("xeon")) cache = "30 MB L3";
  else if (ml.includes("core") || ml.includes("i9") || ml.includes("i7")) cache = "16 MB L3";
  else if (ml.includes("i5") || ml.includes("i3")) cache = "8 MB L3";
  else if (ml.includes("ryzen")) cache = "32 MB L3";
  else if (ml.includes("m") && ml.includes("max")) cache = "24 MB L3";

  return { name: model, load, temperature, cores, threads: cores, cache };
}

// ---- GPU ----

export function collectGpuInfo(): GPUInfo {
  const fallback: GPUInfo = {
    name: "Not detected",
    vramTotal: 0,
    vramUsed: 0,
    temperature: -1,
    coreClock: 0,
    memoryClock: 0,
    usage: 0,
  };

  // nvidia-smi (NVIDIA)
  const nv = safeExec(
    "nvidia-smi --query-gpu=name,memory.total,memory.used,temperature.gpu,clocks.current.graphics,clocks.current.memory,utilization.gpu --format=csv,noheader,nounits 2>nul",
  );
  if (nv) {
    const parts = nv.split(",").map((s) => s.trim());
    if (parts.length >= 7) {
      return {
        name: parts[0],
        vramTotal: parseFloat(parts[1]) || 0,
        vramUsed: parseFloat(parts[2]) || 0,
        temperature: Math.round(parseFloat(parts[3])) || -1,
        coreClock: parseFloat(parts[4]) || 0,
        memoryClock: parseFloat(parts[5]) || 0,
        usage: parseFloat(parts[6]) || 0,
      };
    }
  }

  // PowerShell CIM (works on all Windows GPUs — Intel, AMD, NVIDIA without driver tools)
  if (isWindows()) {
    const out = psCmd(
      "Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM | ConvertTo-Csv -NoTypeInformation",
    );
    const rows = parsePsCsv(out);
    if (rows.length > 0) {
      const name = rows[0][0] ?? "Unknown GPU";
      const vramBytes = parseInt(rows[0][1]) || 0;
      return {
        ...fallback,
        name,
        vramTotal: vramBytes > 0 ? Math.round((vramBytes / (1024 * 1024 * 1024)) * 10) / 10 : 0,
      };
    }
  }

  // lspci on Linux
  if (isLinux()) {
    const lspci = safeExec("lspci 2>/dev/null | grep -iE 'vga|3d|display' | head -1 || true");
    if (lspci) {
      return { ...fallback, name: lspci.replace(/^.*: /, "") };
    }
  }

  return fallback;
}

// ---- RAM ----

export function collectRamInfo(): RAMInfo {
  const total = totalmem();
  const free = freemem();
  const used = total - free;
  const percentage = total > 0 ? parseFloat(((used / total) * 100).toFixed(1)) : 0;

  return {
    total: parseFloat((total / 1024 ** 3).toFixed(1)),
    used: parseFloat((used / 1024 ** 3).toFixed(1)),
    free: parseFloat((free / 1024 ** 3).toFixed(1)),
    percentage,
  };
}

// ---- Disk ----

export function collectDiskInfo(): DiskInfo[] {
  if (isWindows()) {
    const out = psCmd(
      "Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID,Size,FreeSpace,FileSystem | ConvertTo-Csv -NoTypeInformation",
    );
    return parsePsCsv(out)
      .map((r) => {
        const total = parseInt(r[1]) || 0;
        const free = parseInt(r[2]) || 0;
        const used = total - free;
        return {
          partition: r[0] ?? "?",
          total: total > 0 ? parseFloat((total / 1024 ** 3).toFixed(1)) : 0,
          used: used > 0 ? parseFloat((used / 1024 ** 3).toFixed(1)) : 0,
          free: free > 0 ? parseFloat((free / 1024 ** 3).toFixed(1)) : 0,
          percentage: total > 0 ? Math.round((used / total) * 100) : 0,
          filesystem: r[3] ?? "Unknown",
        };
      })
      .filter((d) => d.total > 0);
  }

  if (isLinux()) {
    const df = safeExec("df -B1 --output=target,size,used,avail,fstype 2>/dev/null || true");
    return df
      .split("\n")
      .slice(1)
      .map((line) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 5) return null;
        const total = parseInt(parts[1]) || 0;
        const used = parseInt(parts[2]) || 0;
        return {
          partition: parts[0],
          total: parseFloat((total / 1024 ** 3).toFixed(1)),
          used: parseFloat((used / 1024 ** 3).toFixed(1)),
          free: parseFloat(((total - used) / 1024 ** 3).toFixed(1)),
          percentage: total > 0 ? Math.round((used / total) * 100) : 0,
          filesystem: parts[4] ?? "Unknown",
        } as DiskInfo;
      })
      .filter((d): d is DiskInfo => d !== null && d.total > 0);
  }

  return [];
}

function fallbackNet(iface: string): NetworkInfo {
  return {
    interfaceName: iface,
    downloadSpeed: 0,
    uploadSpeed: 0,
    downloadMax: 1000,
    uploadMax: 500,
  };
}

// ---- Network ----

export function collectNetworkInfo(): NetworkInfo {
  const now = Date.now();

  if (isWindows()) {
    const out = psCmd(
      'Get-CimInstance Win32_NetworkAdapter where "NetEnabled=TRUE" | Select-Object Name,BytesReceived,BytesSent | ConvertTo-Csv -NoTypeInformation',
    );
    const rows = parsePsCsv(out);
    let rx = 0;
    let tx = 0;
    const names: string[] = [];
    for (const r of rows) {
      const bRecv = parseInt(r[1]) || 0;
      const bSent = parseInt(r[2]) || 0;
      if (bRecv > 0 || bSent > 0) {
        rx += bRecv;
        tx += bSent;
        names.push(r[0] ?? "");
      }
    }
    const displayName = names[0] || "Ethernet";

    if (prevNetStats && prevNetTime > 0) {
      const elapsed = (now - prevNetTime) / 1000;
      if (elapsed <= 0) return fallbackNet(displayName);
      const drx = ((rx - (prevNetStats[displayName]?.rx ?? rx)) * 8) / 1_000_000;
      const dtx = ((tx - (prevNetStats[displayName]?.tx ?? tx)) * 8) / 1_000_000;
      prevNetStats = { ...prevNetStats, [displayName]: { rx, tx } };
      prevNetTime = now;
      return {
        interfaceName: displayName,
        downloadSpeed: Math.max(0, parseFloat(drx.toFixed(1))),
        uploadSpeed: Math.max(0, parseFloat(dtx.toFixed(1))),
        downloadMax: 1000,
        uploadMax: 500,
      };
    }

    prevNetStats = { [displayName]: { rx, tx } };
    prevNetTime = now;
    return fallbackNet(displayName);
  }

  if (isLinux()) {
    const net = safeExec("cat /proc/net/dev 2>/dev/null || true");
    for (const line of net.split("\n")) {
      const parts = line.trim().split(/\s+/);
      if (!parts[0] || !parts[0].endsWith(":")) continue;
      const name = parts[0].replace(":", "");
      const rxBytes = parseInt(parts[1]) || 0;
      const txBytes = parseInt(parts[9]) || 0;
      if (prevNetStats && prevNetTime > 0) {
        const elapsed = (now - prevNetTime) / 1000;
        if (elapsed <= 0) return fallbackNet(name);
        const drx = ((rxBytes - (prevNetStats[name]?.rx ?? rxBytes)) * 8) / 1_000_000;
        const dtx = ((txBytes - (prevNetStats[name]?.tx ?? txBytes)) * 8) / 1_000_000;
        prevNetStats = { ...prevNetStats, [name]: { rx: rxBytes, tx: txBytes } };
        prevNetTime = now;
        return {
          interfaceName: name,
          downloadSpeed: Math.max(0, parseFloat(drx.toFixed(1))),
          uploadSpeed: Math.max(0, parseFloat(dtx.toFixed(1))),
          downloadMax: 1000,
          uploadMax: 500,
        };
      }
      prevNetStats = { [name]: { rx: rxBytes, tx: txBytes } };
      prevNetTime = now;
      return fallbackNet(name);
    }
  }

  return fallbackNet("eth0");
}

// ---- Processes ----

export function collectProcesses(): ProcessInfo[] {
  if (isWindows()) {
    // PowerShell (reliable on all modern Windows)
    const out = psCmd(
      "Get-Process | Select-Object Id,ProcessName,WorkingSet64,CPU | Sort-Object CPU -Descending | Select-Object -First 20 | ConvertTo-Csv -NoTypeInformation",
    );
    const rows = parsePsCsv(out);
    if (rows.length > 0) {
      return rows.map((r) => ({
        pid: parseInt(r[0]) || 0,
        name: r[1] ?? "unknown",
        cpuUsage: parseFloat(r[3]) || 0,
        ramUsage: parseFloat(((parseInt(r[2]) || 0) / (1024 * 1024)).toFixed(1)),
        diskUsage: 0,
        networkUsage: 0,
        gpuUsage: 0,
        user: "system",
      }));
    }

    // Fallback: tasklist
    const task = safeExec("tasklist /fo csv /nh");
    if (task) {
      return task
        .split("\n")
        .slice(0, 100)
        .map((line) => {
          const parts = line.replace(/"/g, "").split(",");
          const pid = parseInt(parts[1]) || 0;
          const name = parts[0] ?? "unknown";
          const ramStr = parts[4]?.replace(/[^\d]/g, "") ?? "0";
          return {
            pid,
            name,
            cpuUsage: 0,
            ramUsage: Math.round(parseInt(ramStr) / 1024) || 0,
            diskUsage: 0,
            networkUsage: 0,
            gpuUsage: 0,
            user: parts[2]?.trim() ?? "system",
          };
        })
        .filter((p) => p.pid > 0)
        .slice(0, 15);
    }
  }

  if (isLinux()) {
    const ps = safeExec("ps aux --sort=-%cpu 2>/dev/null | head -16 || true");
    if (ps) {
      return ps
        .split("\n")
        .slice(1)
        .map((line) => {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[1]) || 0;
          const name = parts.slice(10).join(" ") || "unknown";
          return {
            pid,
            name,
            cpuUsage: parseFloat(parts[2]) || 0,
            ramUsage: parseFloat(((parseFloat(parts[5]) || 0) / 1024).toFixed(1)),
            diskUsage: 0,
            networkUsage: 0,
            gpuUsage: 0,
            user: parts[0] ?? "system",
          };
        })
        .filter((p) => p.pid > 0)
        .slice(0, 15);
    }
  }

  return [];
}

// ---- System Info (all-in-one) ----

export function collectSystemStats(): SystemInfo {
  return {
    hostname: hostname(),
    cpu: collectCpuInfo(),
    gpu: collectGpuInfo(),
    ram: collectRamInfo(),
    disks: collectDiskInfo(),
    network: collectNetworkInfo(),
    processes: collectProcesses(),
  };
}
