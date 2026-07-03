import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // Next.js config — applies to ui/ files by default (filters internally)
  {
    settings: {
      next: {
        rootDir: "./ui",
      },
      react: {
        version: "19.0.0",
      },
    },
  },
  ...nextVitals,
  ...nextTs,
  // Point no-html-link-for-pages to App Router directory
  {
    files: ["ui/**/*.{ts,tsx}"],
    rules: {
      "@next/next/no-html-link-for-pages": ["error", "./ui/app"],
    },
  },
  // Root config files
  {
    files: ["*.config.*", "*.mjs", "*.ts"],
  },
  // Global ignores
  globalIgnores([
    "**/node_modules/**",
    "**/dist/**",
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "*.tsbuildinfo",
    "next-env.d.ts",
    "pnpm-lock.yaml",
  ]),
]);

export default eslintConfig;
