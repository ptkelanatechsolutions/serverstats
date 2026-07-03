#!/usr/bin/env node

/**
 * Bundle script — copies ONLY the production build output into cli/ui/
 * so the published npm package can serve the pre-built dashboard.
 *
 * Next.js `next start` only needs:
 *   1. .next/  — compiled output (pages, chunks, static assets)
 *   2. public/ — static files referenced by the build (favicon, svgs, etc.)
 *
 * Run after:  pnpm --filter serverstat-ui build
 * Run before: npm publish (via prepublishOnly)
 */

import { cpSync, existsSync, mkdirSync, rmSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = resolve(__dirname, ".."); // cli/
const UI_ROOT = resolve(CLI_ROOT, "..", "ui");
const DEST = resolve(CLI_ROOT, "app", "ui"); // cli/app/ui/

console.log("🔨 Bundling UI into CLI package...");
console.log(`   Source: ${UI_ROOT}`);
console.log(`   Dest:   ${DEST}`);

// Clean previous bundle
if (existsSync(DEST)) {
  rmSync(DEST, { recursive: true });
}

// Verify UI build exists
const nextDir = resolve(UI_ROOT, ".next");
if (!existsSync(nextDir)) {
  console.error("❌ UI build not found at", nextDir);
  console.error("   Run 'pnpm --filter serverstat-ui build' first.");
  process.exit(1);
}

mkdirSync(DEST, { recursive: true });

// Copy .next/ (production build output — this is the actual compiled app)
// Exclude cache/ and types/ — not needed at runtime
console.log("   Copying .next/ (excluding cache + types) ...");
cpSync(nextDir, resolve(DEST, ".next"), {
  recursive: true,
  filter: (src) => {
    const rel = src.replace(nextDir, "");
    return (
      !rel.startsWith("\\cache") &&
      !rel.startsWith("/cache") &&
      !rel.startsWith("\\types") &&
      !rel.startsWith("/types")
    );
  },
});

// Copy public/ (static assets — favicon, images, etc. referenced by the build)
const publicDir = resolve(UI_ROOT, "public");
if (existsSync(publicDir)) {
  console.log("   Copying public/ ...");
  cpSync(publicDir, resolve(DEST, "public"), { recursive: true });
}

const sizeMB = getDirSize(DEST);
console.log(`\n✅ UI bundled: ${(sizeMB / 1024 / 1024).toFixed(1)} MB`);
console.log("   Ready for npm publish!");

function getDirSize(dirPath) {
  let total = 0;
  try {
    for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
      const fullPath = resolve(dirPath, entry.name);
      if (entry.isDirectory()) total += getDirSize(fullPath);
      else if (entry.isFile()) total += statSync(fullPath).size;
    }
  } catch {
    /* ignore */
  }
  return total;
}
