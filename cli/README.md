# serverstat

**Real-time server monitoring dashboard — CLI & npm package**

[![npm version](https://img.shields.io/npm/v/serverstat?color=4288c9)](https://www.npmjs.com/package/serverstat)
[![npm downloads](https://img.shields.io/npm/dm/serverstat?color=4288c9)](https://www.npmjs.com/package/serverstat)

---

## Install

```bash
npm install -g serverstat
```

Or run without installing:

```bash
npx serverstat
```

## Usage

```bash
serverstat [options]
```

Starts the monitoring dashboard as a background daemon. Open `http://localhost:3000` to view it.

### Options

| Flag              | Default     | Description          |
| ----------------- | ----------- | -------------------- |
| `--port <number>` | `3000`      | Port for the web UI  |
| `--host <string>` | `localhost` | Host address to bind |
| `-v, --version`   | —           | Show version number  |
| `-h, --help`      | —           | Show help message    |

### Examples

```bash
serverstat                          # Start on http://localhost:3000
serverstat stop                     # Stop the running daemon
serverstat --port 8080              # Start on port 8080
serverstat --host 0.0.0.0           # Listen on all interfaces
serverstat --port 8080 --host 0.0.0.0
```

### Stopping the server

The server runs in the background:

```
🚀 ServerStat v1.0.0 is running
   URL: http://localhost:3000
   PID: 12345

To stop: serverstat stop
```

Stop it with:

```bash
serverstat stop
```

## Dashboard features

| Section       | Data shown                                        |
| ------------- | ------------------------------------------------- |
| **CPU**       | Model, load %, temperature, cores, threads, cache |
| **GPU**       | Model, VRAM, temperature, clock speeds, usage %   |
| **RAM**       | Total, used, free, usage %                        |
| **Disk**      | Per-partition breakdown with filesystem           |
| **Network**   | Download / upload speed (live)                    |
| **Processes** | Top 20 sorted by any metric                       |

The UI auto-refreshes every 3 seconds with live data.

## Requirements

- **Node.js** 20+
- Works on Windows, Linux, and macOS

## How it works

ServerStat bundles a pre-built Next.js production build inside the npm package. When you run the CLI:

1. It starts the Next.js server as a detached child process
2. The server exposes a REST API at `/api/stats` that collects system metrics
3. The dashboard UI polls this API and renders live data

No external services, no cloud, no configuration.

## License

MIT
