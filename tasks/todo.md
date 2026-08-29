# PhytoScan — Task List

Implementation plan: `tasks/plan.md`

## Phase 1: Foundation

### Task 1: Project setup & dependencies
- [ ] Install: `motion`, `react-webcam`, `@supabase/supabase-js`, `@supabase/ssr`, `zod`
- [ ] Init shadcn/ui (`components.json`, Tailwind v4 compatible) + primitives (button, card, badge, sheet, textarea, separator, skeleton)
- [ ] Create `src/lib/utils.ts` (cn helper)
- [ ] Add supporting deps as shadcn requires (`cva`, `clsx`, `tailwind-merge`, icon family)

**Verification:** `pnpm build`, `pnpm exec tsc --noEmit`, `pnpm lint` pass; shadcn components import cleanly.

**Dependencies:** None

### Task 2: Design system & layout
- [ ] Map DESIGN.md frontmatter tokens into Tailwind v4 `@theme` in `src/app/globals.css`
- [ ] Dark-first default + light-variant (respect `prefers-color-scheme`)
- [ ] Base `layout.tsx` with theme + metadata; seed the SPA shell in `page.tsx`

**Verification:** `pnpm build` + `tsc` pass; theme renders controls in dark & light.

**Dependencies:** Task 1

## Checkpoint: Foundation
- [ ] All tests/build pass
- [ ] Theme renders control in both modes

## Phase 2: Scan core

### Task 3: Types, config, compression
- [ ] `src/lib/types.ts`: zod `PlantAnalysis` schema + chat types
- [ ] `src/lib/config.ts`: env parsing (webhook, supabase, model ids)
- [ ] `src/lib/compress.ts`: canvas resize → JPEG <1MB base64

**Verification:** zip validates a sample image; zod schema parses canonical JSON.

**Dependencies:** Task 1

### Task 4: Camera & geolocation
- [ ] `src/components/camera/CameraView.tsx`: react-webcam fullscreen + gallery upload
- [ ] `src/hooks/useGeolocation.ts`: optional coords, graceful denial

**Verification:** Browser camera previews; upload path works; geolocation optional.

**Dependencies:** Task 3

### Task 5: Light meter & state machine
- [ ] `src/lib/luminance.ts`: average brightness from ImageData
- [ ] `src/components/light/LightMeter.tsx`: real-luminance overlay visualizer
- [ ] `src/components/StateMachine.tsx`: idle→uploading→analyzing→result with Motion transitions (honors reduced-motion)

**Verification:** Meter shows real luminance; states transition smoothly; reduced-motion respected.

**Dependencies:** Task 3, 4

### Task 6: Supabase client, mock, analysis
- [ ] `src/lib/supabase.ts`: client + storage upload
- [ ] `src/lib/mock.ts`: deterministic mock result (same zod schema)
- [ ] `src/lib/analysis.ts`: N8N POST + zod validation + mock routing

**Verification:** Mock scan returns validated result; live path posts to webhook when configured.

**Dependencies:** Task 3

## Checkpoint: Scan flow
- [ ] Full mock scan works end-to-end (capture → compress → light meter → validated result)
- [ ] Base64 <1MB

## Phase 3: Passport + Chat

### Task 7: Analysis result & persistence
- [ ] `src/components/scan/AnalysisResult.tsx`: structured cards (identification, health, light, care)
- [ ] Upload image to Supabase Storage (bucket `plant-photos`), insert `plants` row

**Verification:** Result renders; new row persists with Storage URL; error state on insert failure.

**Dependencies:** Task 6

### Task 8: Plant passport history
- [ ] `src/components/passport/PlantPassport.tsx`: read last 10 scans from Supabase, scrollable list

**Verification:** History renders persisted scans; empty state composed; reload keeps history.

**Dependencies:** Task 7

### Task 9: Plant Doctor chat
- [ ] `src/components/doctor/PlantDoctorChat.tsx`: per-scan thread, persisted to `chat_messages`
- [ ] N8N `/chat` POST (or mock), carries scan context + prior messages

**Verification:** Chat threads persist; messages reload; mock works without backend.

**Dependencies:** Task 7, 8

## Checkpoint: Passport + Chat
- [ ] New scan appears in passport; chat threads persist; reload keeps history

## Phase 4: Backend + Docs

### Task 10: N8N workflow + docs
- [ ] `N8N_SETUP.md`: webhook → (optional) OpenWeather → OpenRouter → parse → Supabase → respond; `/chat`; optional GET `/history`
- [ ] Importable workflow JSON at `docs/n8n/phytoscan-workflow.json`
- [ ] Exact OpenRouter system prompt + JSON schema included and configurable

**Verification:** JSON importable; prompt + schema consistent with frontend zod schema.

**Dependencies:** Task 3 (schema)

## Checkpoint: Complete
- [ ] All acceptance criteria met
- [ ] `pnpm build`, `tsc --noEmit`, `pnpm lint` green
- [ ] Mock mode + (if configured) live mode verified
- [ ] Ready for review
