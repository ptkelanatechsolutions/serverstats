# Contributing to ServerStat

Thank you for considering contributing! This document outlines the development workflow and conventions.

## Repository structure

```
serverstat/
├── cli/              # CLI package (published as `serverstat` on npm)
├── ui/               # Next.js dashboard
├── .github/workflows/
│   ├── code-quality.yml   # Lint, typecheck, format on PR/push
│   └── npm.yml            # Publish to npm on release
├── eslint.config.mjs
├── tsconfig.base.json
├── .prettierrc
└── package.json      # Monorepo root (pnpm workspaces)
```

## Prerequisites

- Node.js 20+
- pnpm 9+

```bash
corepack enable pnpm    # if using Corepack
```

## Setup

```bash
git clone <repo>
cd serverstat
pnpm install
```

## Available scripts

Run from the **root**:

| Script              | Description                        |
| ------------------- | ---------------------------------- |
| `pnpm dev:ui`       | Start Next.js dev server with HMR  |
| `pnpm build:ui`     | Build Next.js for production       |
| `pnpm build:cli`    | Build CLI (TypeScript + bundle UI) |
| `pnpm build:all`    | Both builds (UI → CLI, sequential) |
| `pnpm lint`         | ESLint across all packages         |
| `pnpm typecheck`    | TypeScript `--noEmit` check        |
| `pnpm format`       | Format with Prettier               |
| `pnpm format:check` | Check formatting (CI)              |

## Development workflow

1. **Work on the UI** — run `pnpm dev:ui` for hot-reload
2. **Test with real data** — the API route `/api/stats` collects live system metrics
3. **Build CLI** — `pnpm build:all` builds everything, then `node cli/app/dist/index.js` to test
4. **Lint & typecheck** — `pnpm lint && pnpm typecheck` before committing

## Code conventions

### General

- Use **TypeScript** with strict mode
- All new files use `.tsx` for components, `.ts` for logic
- Format with Prettier (`semi: true`, `singleQuote: false`, `trailingComma: all`, `printWidth: 100`)

### UI components

- Components go in `ui/components/`
- Reusable primitives go in `ui/components/ui/` (Card, Button, Badge, Progress)
- Always use design tokens from `globals.css` (`bg-background`, `text-foreground`, `bg-card`, `border-border`, etc.)
- Always use **lucide-react** for icons

### CLI

- Source in `cli/src/`, output to `cli/app/dist/`
- Zero runtime dependencies (only Node built-ins)
- Error messages go to stderr, success to stdout
- Argument parsing is manual (simple enough without yargs/commander)

### System data collectors

- Go in `ui/lib/system-stats.ts`
- Platform-detection via `os.platform()` at runtime
- `execSync` wrapped in try/catch for graceful fallbacks
- Prefer PowerShell over wmic on Windows (better encoding in Node.js)

## CI/CD

| Workflow           | Trigger             | Checks                  |
| ------------------ | ------------------- | ----------------------- |
| `code-quality.yml` | PR / push to `main` | Lint, typecheck, format |
| `npm.yml`          | Release published   | Build + publish to npm  |

## Publishing

1. Create a new **Release** on GitHub with a `v*` tag
2. The `npm.yml` workflow builds and publishes automatically
   - `vX.Y.Z` → `npm publish --tag latest`
   - `vX.Y.Z-{name}.{num}` → `npm publish --tag next`

Users install with:

```bash
npm install -g serverstat              # latest stable
npm install -g serverstat@1.0.0-beta.1 # specific pre-release
```

## Questions?

Open an issue or start a discussion. We're happy to help!
