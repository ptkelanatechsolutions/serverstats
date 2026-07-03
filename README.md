<div align="center">

# ⚡ ServerStat

**Real-time server monitoring dashboard**  
CPU · GPU · RAM · Disk · Network · Processes

[![npm version](https://img.shields.io/npm/v/serverstat?color=4288c9)](https://www.npmjs.com/package/serverstat)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

</div>

---

## Overview

**ServerStat** is a single-page monitoring dashboard that shows live system metrics straight from your machine. It collects real-time data via OS APIs and renders it in a clean, responsive UI powered by Next.js.

No agents, no cloud, no configuration — just run it.

### Dashboard

| Metric        | Details                                          |
| ------------- | ------------------------------------------------ |
| **CPU**       | Name, load %, temperature, cores, threads, cache |
| **GPU**       | Name, VRAM, temperature, clock speeds, usage     |
| **RAM**       | Total, used, free, usage %                       |
| **Disk**      | Per-partition with filesystem type               |
| **Network**   | Download / upload speed (live)                   |
| **Processes** | Top 20 sorted by CPU, RAM, Disk, Network, or GPU |

---

## Quick start

```bash
npm install -g serverstat
serverstat
```

Open **http://localhost:3000** in your browser.

Stop the server with:

```bash
serverstat stop
```

### Options

| Flag              | Default     | Description  |
| ----------------- | ----------- | ------------ |
| `--port <number>` | `3000`      | Web UI port  |
| `--host <string>` | `localhost` | Bind address |
| `-v, --version`   | —           | Show version |
| `-h, --help`      | —           | Show help    |

```bash
serverstat --port 8080 --host 0.0.0.0
```

> The server runs in the background. Stop it with `serverstat stop`.

---

## Development

This is a pnpm monorepo:

```bash
pnpm install          # install dependencies
pnpm build:all        # build UI + CLI
pnpm dev:ui           # start UI dev server (with HMR)
pnpm lint             # run ESLint
pnpm typecheck        # run TypeScript check
pnpm format           # format with Prettier
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## Packages

| Package                | Description                   |
| ---------------------- | ----------------------------- |
| [`serverstat`](cli/)   | CLI & npm publishable package |
| [`serverstat-ui`](ui/) | Next.js dashboard             |

---

## License

[MIT](LICENSE) © PT Kelana Tech Solutions
