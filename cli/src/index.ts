#!/usr/bin/env node

import { spawn, execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync, unlinkSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

// ---- Setup ----
const __dirname = dirname(fileURLToPath(import.meta.url));
const _require = createRequire(import.meta.url);

const PACKAGE_ROOT = resolve(__dirname, "..", "..");
const UI_DIR = resolve(PACKAGE_ROOT, "app", "ui");

// ---- Version ----
function readVersion(): string {
  try {
    const pkgPath = resolve(PACKAGE_ROOT, "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

const VERSION = readVersion();

// ---- Help text ----
const HELP_TEXT = `serverstat v${VERSION}

Usage: serverstat [options]

Start the ServerStat monitoring dashboard UI.

Options:
  --port <number>    Port to listen on (default: 3000)
  --host <string>    Host address to bind (default: localhost)
  -v, --version      Show version number
  -h, --help         Show this help message

Examples:
  serverstat                          Start on http://localhost:3000
  serverstat stop                     Stop the running daemon
  serverstat --port 8080              Start on port 8080
  serverstat --host 0.0.0.0           Bind to all interfaces
  serverstat --port 8080 --host 0.0.0.0
  serverstat --host 0.0.0.0 --port 8080

The server runs as a background daemon.
`.trim();

// ---- Types ----
interface ServerState {
  pid: number;
  port: number;
  host: string;
  version: string;
}

interface CLIOptions {
  port: number;
  host: string;
  showHelp: boolean;
  showVersion: boolean;
  hasFlags: boolean;
}

// ---- State File — dual-write to survive npm upgrades & temp file cleanup ----
import { tmpdir } from "node:os";

function getStatePaths(): string[] {
  // Written to two locations so a missing file never blocks stop:
  // 1. os.tmpdir()/serverstat/    — survives npm upgrades
  // 2. PACKAGE_ROOT/app/           — survives temp file cleanup
  return [
    resolve(PACKAGE_ROOT, "app", "serverstat.json"),
    resolve(tmpdir(), "serverstat", "state.json"),
  ];
}

/** Read from any available state file, trying all known paths + legacy PID. */
function readStateFile(): ServerState | null {
  // Try all state.json locations
  for (const jsonPath of getStatePaths()) {
    if (existsSync(jsonPath)) {
      try {
        const raw = readFileSync(jsonPath, "utf-8").trim();
        const state = JSON.parse(raw) as ServerState;
        if (state.pid && state.port) return state;
      } catch {
        try {
          unlinkSync(jsonPath);
        } catch {
          /* ignore */
        }
      }
    }
  }

  // Fallback: legacy .pid file from alpha.1
  const legacyPid = resolve(PACKAGE_ROOT, "app", "serverstat.pid");
  if (existsSync(legacyPid)) {
    try {
      const raw = readFileSync(legacyPid, "utf-8").trim();
      const pid = parseInt(raw, 10);
      if (pid && pid > 0) {
        return { pid, port: 3000, host: "localhost", version: "legacy" };
      }
    } catch {
      try {
        unlinkSync(legacyPid);
      } catch {
        /* ignore */
      }
    }
  }

  return null;
}

/** Write state to all known paths. */
function writeStateFile(pid: number, port: number, host: string): string {
  const state: ServerState = { pid, port, host, version: VERSION };
  const content = JSON.stringify(state, null, 2) + "\n";
  let first = "";
  for (const path of getStatePaths()) {
    const dir = resolve(path, "..");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(path, content);
    if (!first) first = path;
  }
  return first;
}

/** Remove all state files (all paths + legacy). */
function removeStateFile(): void {
  for (const jsonPath of getStatePaths()) {
    if (existsSync(jsonPath))
      try {
        unlinkSync(jsonPath);
      } catch {
        /* ignore */
      }
  }
  const legacyPid = resolve(PACKAGE_ROOT, "app", "serverstat.pid");
  if (existsSync(legacyPid))
    try {
      unlinkSync(legacyPid);
    } catch {
      /* ignore */
    }
}

// ---- Process helpers ----
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Kill the daemon and remove state. Returns true if killed, false if not running. */
function killDaemon(): boolean {
  const state = readStateFile();

  if (!state) {
    return false;
  }

  if (!isProcessAlive(state.pid)) {
    removeStateFile();
    return false;
  }

  try {
    process.kill(state.pid, "SIGTERM");
    const start = Date.now();
    while (Date.now() - start < 4000) {
      if (!isProcessAlive(state.pid)) break;
      const begin = Date.now();
      while (Date.now() - begin < 100) {
        /* busy-spin */
      }
    }

    if (isProcessAlive(state.pid)) {
      process.kill(state.pid, "SIGKILL");
    }
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code !== "ESRCH") {
      console.error(`Failed to stop process ${state.pid}: ${nodeErr.message}`);
      return false;
    }
  }

  removeStateFile();
  return true;
}

/** Try to find and kill a process by name or listening port. */
function findAndKillDaemon(): boolean {
  try {
    // Strategy 1 (Linux/macOS): find by process name (argv0 = "serverstat-daemon")
    if (process.platform === "linux" || process.platform === "darwin") {
      const pgrep = execSync(
        `pgrep -x serverstat-daemon 2>/dev/null || pgrep -f "next start" 2>/dev/null || true`,
        { encoding: "utf-8", timeout: 3000 },
      ).trim();
      if (pgrep) {
        const pids = pgrep
          .split("\n")
          .map(Number)
          .filter((p) => p > 0);
        for (const pid of pids) {
          try {
            process.kill(pid, "SIGTERM");
          } catch {
            /* ignore */
          }
        }
        return pids.length > 0;
      }
    }

    // Strategy 2 (Windows): scan common ports via PowerShell
    if (process.platform === "win32") {
      const ps = execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -ge 3000 -and $_.LocalPort -le 3010 } | Select-Object -ExpandProperty OwningProcess -Unique"`,
        { encoding: "utf-8", timeout: 3000 },
      ).trim();
      const pids = ps
        .split("\n")
        .map(Number)
        .filter((p) => p > 0);
      for (const pid of pids) {
        try {
          process.kill(pid, "SIGTERM");
        } catch {
          /* ignore */
        }
      }
      return pids.length > 0;
    }
  } catch {
    // Command not available — fall through
  }
  return false;
}

/** Public stop — tries state file → process name → port probe. Exits the process. */
async function stopDaemon(): Promise<void> {
  // 1. Try state file (JSON + legacy PID)
  if (killDaemon()) {
    console.log("✅ ServerStat stopped.");
    process.exit(0);
  }

  // 2. Try finding by process name (serverstat-daemon, next start, node)
  if (findAndKillDaemon()) {
    console.log("✅ ServerStat stopped (found and killed by process name).");
    removeStateFile();
    process.exit(0);
  }

  console.log("ℹ️  ServerStat is not running.");
  console.log("   No daemon process was found.");
  console.log("   To start: serverstat");
  process.exit(0);
}

// ---- Argument Parsing ----
function parseArgs(argv: string[]): CLIOptions {
  const args = argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    return { port: 3000, host: "localhost", showHelp: true, showVersion: false, hasFlags: false };
  }

  if (args.includes("--version") || args.includes("-v")) {
    return { port: 3000, host: "localhost", showHelp: false, showVersion: true, hasFlags: false };
  }

  let port = 3000;
  let host = "localhost";
  let hasFlags = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--port") {
      const val = args[++i];
      if (val === undefined || val.startsWith("-")) {
        console.error("Error: --port requires a numeric argument\n");
        console.error(HELP_TEXT);
        process.exit(1);
      }
      const parsed = Number(val);
      if (isNaN(parsed) || parsed < 0 || parsed > 65535 || !Number.isInteger(parsed)) {
        console.error("Error: --port must be a valid port number (0-65535)\n");
        console.error(HELP_TEXT);
        process.exit(1);
      }
      port = parsed;
      hasFlags = true;
    } else if (arg === "--host") {
      const val = args[++i];
      if (val === undefined || val.startsWith("-")) {
        console.error("Error: --host requires a string argument\n");
        console.error(HELP_TEXT);
        process.exit(1);
      }
      host = val;
      hasFlags = true;
    } else {
      console.error(`Error: unknown option "${arg}"\n`);
      console.error(HELP_TEXT);
      process.exit(1);
    }
  }

  return { port, host, showHelp: false, showVersion: false, hasFlags };
}

// ---- Resolve next binary ----
function findNextEntry(): string {
  const devPath = resolve(PACKAGE_ROOT, "..", "ui", "node_modules", "next", "package.json");
  if (existsSync(devPath)) {
    const pkg = JSON.parse(readFileSync(devPath, "utf-8"));
    return resolve(dirname(devPath), pkg.bin?.next ?? "dist/bin/next");
  }

  try {
    const nextPkgPath = _require.resolve("next/package.json");
    const nextDir = dirname(nextPkgPath);
    const nextPkg = JSON.parse(readFileSync(nextPkgPath, "utf-8"));
    return resolve(nextDir, nextPkg.bin?.next ?? "dist/bin/next");
  } catch {
    console.error(
      "Error: Could not find Next.js. Make sure 'next' is installed.\n" +
        "  Run: npm install --save next react react-dom",
    );
    process.exit(1);
  }
}

// ---- Wait for server ----
async function waitForServer(url: string, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  const http = await import("node:http");
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(url, (res) => {
          res.resume();
          resolve();
        });
        req.on("error", reject);
        req.setTimeout(2000, () => {
          req.destroy();
          reject(new Error("timeout"));
        });
      });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`Server did not start within ${timeoutMs / 1000}s`);
}

// ---- Start server (extracted, resuable) ----
async function startServer(port: number, host: string): Promise<void> {
  // Check bundled UI
  if (!existsSync(resolve(UI_DIR, ".next", "BUILD_ID"))) {
    console.error(
      "Error: ServerStat UI is not built.\n\n" +
        "  If installed from npm, reinstall: npm install -g serverstat\n" +
        "  If developing locally, run: pnpm build\n",
    );
    process.exit(1);
  }

  // Probe port (only when no existing serverstat owns it — checked by caller)
  const http = await import("node:http");
  const probeUrl = `http://localhost:${port}`;
  try {
    await new Promise<void>((resolve, reject) => {
      const req = http.get(probeUrl, (res) => {
        res.resume();
        reject(new Error("inuse"));
      });
      req.on("error", () => resolve());
      req.setTimeout(1000, () => {
        req.destroy();
        resolve();
      });
    });
  } catch {
    console.error(`Error: Port ${port} is already in use by another application.`);
    process.exit(1);
  }

  const nextEntry = findNextEntry();

  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    PORT: String(port),
    HOSTNAME: host,
    NODE_PATH: resolve(PACKAGE_ROOT, "node_modules"),
  };

  // Set argv0 so the process appears as "serverstat-daemon" in htop/btop/ps
  const child = spawn(process.execPath, [nextEntry, "start"], {
    cwd: UI_DIR,
    env,
    stdio: ["ignore", "ignore", "ignore"],
    detached: true,
    argv0: "serverstat-daemon",
  });

  child.unref();

  try {
    await waitForServer(`http://localhost:${port}`);
  } catch {
    console.error("Server failed to start. Check port availability.");
    process.exit(1);
  }

  const statePath = writeStateFile(child.pid!, port, host);

  console.log(`🚀 ServerStat v${VERSION} is running`);
  console.log(`   URL: http://${host}:${port}`);
  console.log(`   PID: ${child.pid}`);
  console.log(`   State file: ${statePath}`);
  console.log(`\nTo stop: serverstat stop`);
}

// ---- Main ----
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle stop command
  if (args[0] === "stop") {
    await stopDaemon();
  }

  const options = parseArgs(process.argv);

  if (options.showHelp) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (options.showVersion) {
    console.log(VERSION);
    process.exit(0);
  }

  // Check if service is already running
  const state = readStateFile();
  if (state && isProcessAlive(state.pid)) {
    if (!options.hasFlags) {
      // No flags — just show info
      console.log(`ℹ️  ServerStat is already running`);
      console.log(`   URL: http://${state.host}:${state.port}`);
      console.log(`   PID: ${state.pid}`);
      console.log(
        `\nTo restart with different settings, use:\n   serverstat --port <port> --host <host>`,
      );
      console.log(`\nTo stop: serverstat stop`);
      process.exit(0);
    }

    // Has flags — stop current, then start new
    const samePort = options.port === state.port;
    const sameHost = options.host === state.host;

    if (samePort && sameHost) {
      console.log(`ℹ️  ServerStat is already running on the same host:port`);
      console.log(`   URL: http://${state.host}:${state.port}`);
      process.exit(0);
    }

    console.log(`Stopping current server (http://${state.host}:${state.port}) ...`);
    killDaemon();
    console.log("Starting new instance...");
    await startServer(options.port, options.host);
    return;
  }

  // No running service — clean stale state and start fresh
  if (state && !isProcessAlive(state.pid)) {
    removeStateFile();
  }

  await startServer(options.port, options.host);
}

main();
