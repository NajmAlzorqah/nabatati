# PhytoScan — Task List

Implementation plan: `tasks/plan.md`

## Phase 1: Foundation

### Task 1: Project setup & dependencies
- [x] Install: `motion`, `react-webcam`, `@supabase/supabase-js`, `@supabase/ssr`, `zod`
- [x] Init shadcn/ui (`components.json`, Tailwind v4 compatible) + primitives (button, card, badge, sheet, textarea, separator, skeleton)
- [x] Create `src/lib/utils.ts` (cn helper)
- [x] Add supporting deps as shadcn requires (`cva`, `clsx`, `tailwind-merge`, icon family)

**Verification:** `pnpm build`, `pnpm exec tsc --noEmit`, `pnpm lint` pass; shadcn components import cleanly.

**Dependencies:** None

### Task 2: Design system & layout
- [x] Map DESIGN.md frontmatter tokens into Tailwind v4 `@theme` in `src/app/globals.css`
- [x] Dark-first default + light-variant (respect `prefers-color-scheme`)
- [x] Base `layout.tsx` with theme + metadata; seed the SPA shell in `page.tsx`

**Verification:** `pnpm build` + `tsc` pass; theme renders controls in dark & light.

**Dependencies:** Task 1

## Checkpoint: Foundation
- [x] All tests/build pass
- [x] Theme renders control in both modes

## Phase 2: Scan core

### Task 3: Types, config, compression
- [x] `src/lib/types.ts`: zod `PlantAnalysis` schema + chat types
- [x] `src/lib/config.ts`: env parsing (webhook, supabase, model ids)
- [x] `src/lib/compress.ts`: canvas resize → JPEG <1MB base64

**Verification:** zip validates a sample image; zod schema parses canonical JSON.

**Dependencies:** Task 1

### Task 4: Camera & geolocation
- [x] `src/components/camera/CameraView.tsx`: react-webcam fullscreen + gallery upload
- [x] `src/hooks/useGeolocation.ts`: optional coords, graceful denial

**Verification:** Browser camera previews; upload path works; geolocation optional.

**Dependencies:** Task 3

### Task 5: Light meter & state machine
- [x] `src/lib/luminance.ts`: average brightness from ImageData
- [x] `src/components/light/LightMeter.tsx`: real-luminance overlay visualizer
- [x] `src/components/StateMachine.tsx`: idle→uploading→analyzing→result with Motion transitions (honors reduced-motion)

**Verification:** Meter shows real luminance; states transition smoothly; reduced-motion respected.

**Dependencies:** Task 3, 4

### Task 6: Supabase client, analysis
- [x] `src/lib/supabase.ts`: client + storage upload
- [x] `src/lib/analysis.ts`: N8N POST + zod validation (+ "not configured" guard, no mock)

**Verification:** Configured path posts to webhook and returns a validated result; unconfigured path surfaces a clear error instead of placeholder data.

**Dependencies:** Task 3

## Checkpoint: Scan flow
- [x] Full scan works end-to-end (capture → compress → light meter → validated result)
- [x] Base64 <1MB

## Phase 3: Passport + Chat

### Task 7: Analysis result & persistence
- [x] `src/components/scan/AnalysisResult.tsx`: structured cards (identification, health, light, care)
- [x] Upload image to Supabase Storage (bucket `plant-photos`), insert `plants` row

**Verification:** Result renders; new row persists with Storage URL; error state on insert failure.

**Dependencies:** Task 6

### Task 8: Plant passport history
- [x] `src/components/passport/PlantPassport.tsx`: read last 10 scans from Supabase, scrollable list

**Verification:** History renders persisted scans; empty state composed; reload keeps history.

**Dependencies:** Task 7

### Task 9: Plant Doctor chat
- [x] `src/components/doctor/PlantDoctorChat.tsx`: per-scan thread, persisted to `chat_messages`
- [x] N8N `/chat` POST, carries scan context + prior messages

**Verification:** Chat threads persist; messages reload; unconfigured chat shows a clear "not configured" error.

**Dependencies:** Task 7, 8

## Checkpoint: Passport + Chat
- [x] New scan appears in passport; chat threads persist; reload keeps history

## Phase 4: Backend + Docs

### Task 10: N8N workflow + docs
- [x] `N8N_SETUP.md`: webhook → (optional) OpenWeather → OpenRouter → parse → respond; `/chat`; env vars + Supabase schema
- [x] Importable workflow JSON(s) at `docs/n8n/phytoscan-analyze.workflow.json`, `docs/n8n/phytoscan-chat.workflow.json`
- [x] Supabase schema at `docs/supabase/schema.sql` (`plants`, `chat_messages`, `plant-photos` bucket)
- [x] Exact OpenRouter system prompt + JSON schema; consistent with frontend zod schema (persistence handled by frontend, not N8N)

**Verification:** JSON importable; prompt + schema consistent with frontend zod schema.

**Dependencies:** Task 3 (schema)

## Checkpoint: Complete
- [x] All acceptance criteria met
- [x] `pnpm build`, `tsc --noEmit`, `pnpm lint` green
- [x] Unconfigured webhook → clear "not configured" error (no placeholder data); configured path verified
- [x] Ready for review
