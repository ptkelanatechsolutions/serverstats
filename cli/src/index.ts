#!/usr/bin/env node

import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync, unlinkSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

// ---- Setup ----
// cli/src/index.ts → cli/app/dist/index.js
const __dirname = dirname(fileURLToPath(import.meta.url));
const _require = createRequire(import.meta.url);

// Package root is cli/ (three levels up from app/dist/index.js)
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
`.trim();

// ---- Argument Parsing ----
interface CLIOptions {
  port: number;
  host: string;
  showHelp: boolean;
  showVersion: boolean;
}

function parseArgs(argv: string[]): CLIOptions {
  const args = argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    return { port: 3000, host: "localhost", showHelp: true, showVersion: false };
  }

  if (args.includes("--version") || args.includes("-v")) {
    return { port: 3000, host: "localhost", showHelp: false, showVersion: true };
  }

  let port = 3000;
  let host = "localhost";

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
    } else if (arg === "--host") {
      const val = args[++i];
      if (val === undefined || val.startsWith("-")) {
        console.error("Error: --host requires a string argument\n");
        console.error(HELP_TEXT);
        process.exit(1);
      }
      host = val;
    } else {
      console.error(`Error: unknown option "${arg}"\n`);
      console.error(HELP_TEXT);
      process.exit(1);
    }
  }

  return { port, host, showHelp: false, showVersion: false };
}

// ---- Resolve next binary ----
function findNextEntry(): string {
  // In development (pnpm workspace): resolve from ui/node_modules/next/package.json
  const devPath = resolve(PACKAGE_ROOT, "..", "ui", "node_modules", "next", "package.json");
  if (existsSync(devPath)) {
    const pkg = JSON.parse(readFileSync(devPath, "utf-8"));
    return resolve(dirname(devPath), pkg.bin?.next ?? "dist/bin/next");
  }

  // In published package: resolve via module resolution from CLI's own dependencies
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

// ---- Wait for server to be ready ----
async function waitForServer(url: string, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  // Use dynamic import — http is required in Node but not in browser
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
      return; // server is up
    } catch {
      // Not ready yet — wait and retry
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`Server did not start within ${timeoutMs / 1000}s`);
}

// ---- Write PID file ----
// ---- PID file ----
function getPidPath(): string {
  return resolve(PACKAGE_ROOT, "app", "serverstat.pid");
}

function writePidFile(pid: number): string {
  const pidPath = getPidPath();
  const pidDir = resolve(PACKAGE_ROOT, "app");
  if (!existsSync(pidDir)) mkdirSync(pidDir, { recursive: true });
  writeFileSync(pidPath, String(pid));
  return pidPath;
}

function stopDaemon(): void {
  const pidPath = getPidPath();

  if (!existsSync(pidPath)) {
    console.error("ServerStat is not running (no PID file found).");
    process.exit(1);
  }

  const pid = parseInt(readFileSync(pidPath, "utf-8").trim(), 10);
  if (!pid || isNaN(pid)) {
    console.error("Invalid PID file. Removing...");
    unlinkSync(pidPath);
    process.exit(1);
  }

  try {
    process.kill(pid, "SIGTERM");
    // Give it a moment
    const start = Date.now();
    while (Date.now() - start < 3000) {
      try {
        process.kill(pid, 0); // check alive
      } catch {
        // process is gone
        break;
      }
    }
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === "ESRCH") {
      // Process already dead — clean up
    } else {
      console.error(`Failed to stop process ${pid}: ${nodeErr.message}`);
      process.exit(1);
    }
  }

  unlinkSync(pidPath);
  console.log("✅ ServerStat stopped.");
  process.exit(0);
}

// ---- Main ----
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle "stop" command
  if (args[0] === "stop") {
    stopDaemon();
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

  const { port, host } = options;

  // Check bundled UI exists
  if (!existsSync(resolve(UI_DIR, ".next", "BUILD_ID"))) {
    console.error(
      "Error: ServerStat UI is not built.\n\n" +
        "  If installed from npm, reinstall: npm install -g serverstat\n" +
        "  If developing locally, run: pnpm build\n",
    );
    process.exit(1);
  }

  // Check if port is already in use
  const http = await import("node:http");
  const probeUrl = `http://localhost:${port}`;
  try {
    await new Promise<void>((resolve, reject) => {
      const req = http.get(probeUrl, (res) => {
        res.resume();
        reject(new Error("inuse")); // got response → port in use
      });
      req.on("error", () => resolve()); // connection refused → port free
      req.setTimeout(1000, () => {
        req.destroy();
        resolve(); // no response in 1s → assume free
      });
    });
  } catch {
    console.error(`Error: Port ${port} is already in use. Use --port to specify a different port.`);
    process.exit(1);
  }

  const nextEntry = findNextEntry();

  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    PORT: String(port),
    HOSTNAME: host,
    NODE_PATH: resolve(PACKAGE_ROOT, "node_modules"),
  };

  const child = spawn(process.execPath, [nextEntry, "start"], {
    cwd: UI_DIR,
    env,
    stdio: ["ignore", "ignore", "ignore"],
    detached: true,
  });

  child.unref();

  // Wait for server to be ready
  try {
    await waitForServer(`http://localhost:${port}`);
  } catch {
    console.error("Server failed to start. Check port availability.");
    process.exit(1);
  }

  const pidPath = writePidFile(child.pid!);

  console.log(`🚀 ServerStat v${VERSION} is running`);
  console.log(`   URL: http://${host}:${port}`);
  console.log(`   PID: ${child.pid}`);
  console.log(`   PID file: ${pidPath}`);
  console.log(`\nTo stop: serverstat stop`);
}

main();
