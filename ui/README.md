# serverstat-ui

The Next.js dashboard for **ServerStat** — a real-time system monitoring UI.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS v4**
- **next-themes** (dark/light mode)
- **lucide-react** (icons)

## Scripts

| Script           | Description               |
| ---------------- | ------------------------- |
| `pnpm dev`       | Start dev server with HMR |
| `pnpm build`     | Production build          |
| `pnpm start`     | Serve production build    |
| `pnpm typecheck` | TypeScript validation     |
| `pnpm clean`     | Remove build artifacts    |

## Structure

```
ui/
├── app/
│   ├── api/stats/route.ts   ← Real-time stats API endpoint
│   ├── layout.tsx           ← Root layout + theme provider
│   ├── page.tsx             ← Dashboard page (client component)
│   ├── providers.tsx        ← next-themes provider
│   └── globals.css          ← Tailwind + design tokens
├── components/
│   ├── ui/                  ← Reusable primitives (Card, Button, Badge, Progress)
│   ├── StatCard.tsx         ← Metric card wrapper
│   ├── CpuCard.tsx          ← CPU metrics
│   ├── GpuCard.tsx          ← GPU metrics
│   ├── RamCard.tsx          ← RAM metrics
│   ├── DiskCard.tsx         ← Disk metrics
│   ├── NetworkCard.tsx      ← Network metrics
│   ├── ProcessTable.tsx     ← Top processes with sortable filters
│   └── ThemeToggle.tsx      ← Dark/light toggle
├── lib/
│   ├── data.ts              ← TypeScript interfaces
│   ├── system-stats.ts      ← OS data collectors (Node.js)
│   └── utils.ts             ← Helper utilities (formatBytes, cn, etc.)
└── public/                  ← Static assets
```

## Data collection

The API route at `/api/stats` collects system metrics using Node.js `os` module and platform-specific commands (PowerShell on Windows, `/proc` on Linux). The dashboard polls this endpoint every 3 seconds for live updates.

## Theming

The UI supports dark, light, and system-default modes via `next-themes`. Design tokens are defined in `globals.css` with CSS custom properties mapped to Tailwind utility classes through `@theme inline`.
