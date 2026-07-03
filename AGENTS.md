= AGENTS.md for ServerStat =
:model: claude-sonnet-5, claude-fable-5, claude-opus-4-8
:instructions: embedded

== STOP — READ THIS FIRST ==

You are an AI coding agent working on the **ServerStat** project — a real-time server monitoring dashboard with CLI + Next.js UI. This file is your primary source of truth. Follow every rule below. Do not skip, approximate, or assume.

Ask the user for clarification when requirements are ambiguous. Do not "just proceed" with an interpretation you are unsure of.

---

== PROJECT OVERVIEW ==

ServerStat is a pnpm monorepo with two packages:

- **cli/** (`serverstat` on npm) — Node.js CLI that starts the dashboard as a background daemon
- **ui/** (`serverstat-ui`) — Next.js 16 single-page dashboard with real-time system metrics

The UI collects system data via Node.js APIs (`os` + `child_process`) and serves it through a REST endpoint at `/api/stats`. The CLI bundles a pre-built `.next/` inside the npm package so end users just run `serverstat` without building anything.

---

== CRITICAL RULES — DO NOT VIOLATE ==

=== 1. Design Tokens ===

All colors MUST use CSS custom properties defined in `ui/app/globals.css`. The `@theme inline` block maps them to Tailwind utility classes. Use these EXCLUSIVELY — never hardcode color values.

| Token                | Tailwind class                            | Purpose                           |
| -------------------- | ----------------------------------------- | --------------------------------- |
| `--background`       | `bg-background`                           | Page background                   |
| `--foreground`       | `text-foreground`                         | Default text                      |
| `--card`             | `bg-card`                                 | Card surface                      |
| `--card-foreground`  | `text-card-foreground`                    | Text on cards                     |
| `--primary`          | `bg-primary text-primary-foreground`      | Primary buttons/accents           |
| `--secondary`        | `bg-secondary text-secondary-foreground`  | Secondary badges                  |
| `--muted`            | `bg-muted`                                | Muted surface (progress bg, etc.) |
| `--muted-foreground` | `text-muted-foreground`                   | Secondary/muted text              |
| `--border`           | `border-border`                           | Card/table borders                |
| `--ring`             | `ring-ring`                               | Focus rings                       |
| `--radius`           | `rounded-[var(--radius)]` or `rounded-md` | Border radius                     |

=== 2. Icons ===

ALL icons MUST come from **lucide-react**. Never use emoji, SVG strings, or other icon libraries. Import with named exports:

```tsx
import { Cpu, Thermometer, Activity } from "lucide-react";
```

=== 3. Components Structure ===

- Reusable primitives go in `ui/components/ui/` (Card, Button, Badge, Progress)
- Feature components go in `ui/components/` (CpuCard, GpuCard, StatCard, etc.)
- Every component MUST be custom — do NOT install any UI library (shadcn/ui, nextui, etc.)

=== 4. Client / Server Boundaries ===

Loading, error, empty, and edge case states MUST be handled for EVERY data-fetching component:

- **Loading**: Show skeleton/spinner. Never render empty UI.
- **Error**: Show error message with retry action. Never silently fail.
- **Empty data**: Show "No data available" message with relevant context.
- **Edge cases**: Handle partial data (e.g., no GPU detected, no disk partitions), invalid values (NaN, negative), platform unsupported.
- Components that use hooks (`useState`, `useEffect`, `useTheme`) MUST have `"use client"` at the top.
- Server Components are the default — only add `"use client"` when necessary.

=== 5. Data Collection ===

System data is collected in `ui/lib/system-stats.ts`. Every collector function MUST:

- Handle errors gracefully (try/catch around execSync)
- Return sensible defaults/falsey values on failure (not throw)
- Support both Windows and Linux (platform detection via `os.platform()`)
- Prefer **PowerShell** over `wmic` on Windows (wmic encoding breaks in Node.js)

=== 6. Package Management ===

- Use `pnpm` for all package operations. Never npm or yarn.
- `cli/package.json` is the published npm package — `name` must be `"serverstat"`.
- `cli/` MUST have zero runtime dependencies beyond `next`, `react`, `react-dom`.
- Argument parsing is manual via `process.argv` — no commander, yargs, or cli libraries.
- The CLI starts Next.js as a detached child process (`detached: true`, `child.unref()`).

=== 7. CLI Commands ===

The binary `serverstat` supports these exact commands:

| Command                    | Behavior                                              |
| -------------------------- | ----------------------------------------------------- |
| `serverstat`               | Start dashboard on localhost:3000 (background daemon) |
| `serverstat stop`          | Kill daemon + remove PID file                         |
| `serverstat --port <n>`    | Start on custom port                                  |
| `serverstat --host <s>`    | Start on custom host                                  |
| `serverstat -v, --version` | Print version from package.json                       |
| `serverstat -h, --help`    | Print help text                                       |

The server runs detached. The CLI polls the server until it responds before printing success and exiting. The PID file is stored at `cli/app/serverstat.pid`.

=== 8. Build Pipeline ===

Build order matters — UI must be built BEFORE CLI:

```bash
pnpm build:ui   # next build → produces ui/.next/
pnpm build:cli  # tsc → cli/app/dist/ + bundle-ui.js (copies .next/ + public/ to cli/app/ui/)
```

The bundle script (`cli/scripts/bundle-ui.js`) copies ONLY `.next/` and `public/` — it MUST exclude `.next/cache/` and `.next/types/` via the `filter` option of `cpSync`.

---

== DIRECTORY MAP ==

```
serverstat/
├── .github/workflows/
│   ├── code-quality.yml   — lint, typecheck, format on PR/push
│   └── npm.yml            — publish to npm on release
├── cli/                   — npm package "serverstat"
│   ├── app/
│   │   ├── dist/          — compiled CLI (tsc output)
│   │   └── ui/            — bundled Next.js build (.next + public)
│   ├── scripts/
│   │   └── bundle-ui.js   — copies ui/.next/ + ui/public/ into cli/app/ui/
│   ├── src/
│   │   └── index.ts       — CLI entry point (argument parsing + daemon spawn)
│   ├── package.json       — published to npm (name: "serverstat")
│   ├── tsconfig.json      — extends ../tsconfig.base.json
│   └── README.md          — npm registry documentation
├── ui/                    — Next.js dashboard (name: "serverstat-ui")
│   ├── app/
│   │   ├── api/stats/route.ts  — GET /api/stats (system data)
│   │   ├── layout.tsx          — root layout + font + providers
│   │   ├── page.tsx            — dashboard (client component, polls /api/stats)
│   │   ├── providers.tsx       — next-themes ThemeProvider
│   │   └── globals.css         — Tailwind + design tokens
│   ├── components/
│   │   ├── ui/                 — Card, Button, Badge, Progress, etc.
│   │   ├── StatCard.tsx        — metric card shell
│   │   ├── CpuCard.tsx         — CPU: name, load, temp, cores, threads, cache
│   │   ├── GpuCard.tsx         — GPU: name, vram, temp, clock, usage
│   │   ├── RamCard.tsx         — RAM: total, used, free, %
│   │   ├── DiskCard.tsx        — disks: per-partition breakdown
│   │   ├── NetworkCard.tsx     — network: download/upload speed
│   │   ├── ProcessTable.tsx    — top processes, sortable filters
│   │   └── ThemeToggle.tsx     — dark/light toggle (hydration-safe)
│   ├── lib/
│   │   ├── data.ts             — TypeScript interfaces (SystemInfo, etc.)
│   │   ├── system-stats.ts     — OS data collectors (Node.js)
│   │   └── utils.ts            — cn(), getUsageColor(), formatBytes(), etc.
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── eslint.config.mjs       — ESLint flat config (ui + cli)
├── tsconfig.base.json       — shared TypeScript config
├── .prettierrc
├── .prettierignore
├── .gitignore
├── pnpm-workspace.yaml     — packages: [cli, ui]
├── package.json             — root scripts
├── README.md
├── CONTRIBUTING.md
├── AGENTS.md                ← you are here
├── LICENSE
└── CLAUDE.md
```

---

== CODE PATTERNS ==

=== API Route ===

```tsx
// ui/app/api/stats/route.ts
import { NextResponse } from "next/server";
import { collectSystemStats } from "@/lib/system-stats";

export async function GET() {
  try {
    const data = collectSystemStats();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Failed to collect system stats:", err);
    return NextResponse.json({ error: "Failed to collect system stats" }, { status: 500 });
  }
}
```

=== Client Component Pattern (page.tsx) ===

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import type { SystemInfo } from "@/lib/data";

export default function Home() {
  const [data, setData] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (!data && !error) return <LoadingSpinner />;
  if (!data && error) return <ErrorState message={error} onRetry={fetchStats} />;
  return <Dashboard data={data} />;
}
```

=== Progress Bar ===

```tsx
import { cn } from "@/lib/utils";
import { getUsageColor } from "@/lib/utils";

// Inner bar: bg-green-500 (<60%), bg-yellow-500 (60-85%), bg-red-500 (>85%)
// Clamp value between 0-100. Handle NaN → 0.
```

=== Color Thresholds ===

| Range   | Color        |
| ------- | ------------ |
| 0–59%   | `green-500`  |
| 60–84%  | `yellow-500` |
| 85–100% | `red-500`    |

---

== COMMON EDGE CASES ==

| Scenario                            | Handling                                       |
| ----------------------------------- | ---------------------------------------------- |
| No GPU detected                     | Show "Not detected" name, 0 for all metrics    |
| CPU temperature unavailable         | Show `-1`, omit badge color                    |
| Network first poll                  | Return 0 speed (no previous sample)            |
| No disk partitions                  | Show "No disk data available" message          |
| No processes                        | Show "No process data available" message       |
| execSync command not found          | try/catch → empty string → fallback value      |
| Port already in use                 | Detect via probe request, print friendly error |
| PID file missing on stop            | Print error "not running"                      |
| Bundled UI missing (.next/BUILD_ID) | Exit with helpful message about reinstall      |

---

== ESLINT — RULES ==

The project uses ESLint 9 flat config (`eslint.config.mjs`). Key overrides:

- `react-hooks/set-state-in-effect` — disabled via inline comment for the polling useEffect (false positive for async fetch)
- `@next/next/no-html-link-for-pages` — set to `["error", "./ui/app"]` for App Router

Always run `pnpm lint` and `pnpm typecheck` before committing. Zero warnings.

---

== BUILD & RELEASE ==

=== Local build ===

```bash
pnpm install
pnpm build:all    # UI (next build) → CLI (tsc + bundle)
pnpm lint
pnpm typecheck
pnpm format:check
```

=== npm release (automated) ===

1. Create a GitHub Release with a `v*` tag
2. `npm.yml` workflow runs on `release.published`
3. Tag format determines dist-tag:
   - `vX.Y.Z` → `npm publish --tag latest`
   - `vX.Y.Z-{name}.{num}` → `npm publish --tag next`
4. `NPM_TOKEN` secret must be set in GitHub repository
