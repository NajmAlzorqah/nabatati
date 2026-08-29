<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project

Plant-detector: a Next.js App Router site using the source of truth from `DESIGN.md` (VitaVege Nutrition — plant-based nutrition companion). Currently a bare `create-next-app` scaffold — no features built yet. The app lives under `src/app/`.

## Commands

Use **pnpm** (not npm/yarn) — pinned in `package.json`, `packageManager: pnpm@11.23.0`.

```bash
pnpm dev        # dev server (localhost:3000)
pnpm build      # production build
pnpm lint       # eslint
pnpm exec tsc --noEmit   # typecheck — there is NO `typecheck` script
```

- No test framework or test script is configured. Verify changes with `build` + `tsc`.
- `reactCompiler: true` is set in `next.config.ts` — the React Compiler is active.
- TypeScript is `strict`. Path alias `@/*` → `src/*`.

## Stack notes

- **Tailwind v4** — configured via `@tailwindcss/postcss` in `postcss.config.mjs`. Do NOT use the v3 `tailwindcss` PostCSS plugin. Tokens live in CSS (see `@theme` in `globals.css`).
- App Router; components live in `src/app/`. Layout already loads Geist via `next/font/google`.

## Design — REQUIRED reading before any UI work

- **`DESIGN.md` is the design system.** For every design or color decision, read `DESIGN.md` and follow its tokens (colors, typography, spacing, radius, shadows, motion, breakpoints) from its frontmatter. Do not invent colors or spacing.
- **`design-taste-frontend` skill governs frontend taste** (lives at `.agents/skills/design-taste-frontend/SKILL.md`). Before building landing/portfolio/redesign UI, load it: infer the design read, then apply its rules (no AI-purple defaults, one accent, no Inter default, contrast checks, etc.). It overrides generic frontend habits.

`CLAUDE.md` just references `@AGENTS.md` and needs no separate maintenance.
