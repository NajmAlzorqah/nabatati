# Implementation Plan: PhytoScan

Cali.ai-inspired plant health identification SPA. Next.js 16 App Router frontend, N8N backend orchestrator, OpenRouter vision AI (free model), Supabase (Postgres + Storage) Plant Passport, Tailwind v4 + shadcn/ui + Motion.

## Overview

Build a mobile-first, single-page application that lets the user capture or upload a plant photo, sends it to an N8N webhook for AI analysis, renders the health/species/care result with a real-luminance "Light Meter" visualizer, persists each scan to a Supabase-backed Plant Passport, and supports a per-scan "Plant Doctor" follow-up chat. The SPA is fully functional in a **mock mode** (no backend env configured) so the entire flow works before the network services are live.

## Design Read

"Reading this as: **mobile-first camera/scan product SPA** for plant owners, with a **dark-botanist premium** language, leaning toward **DESIGN.md tokens** (accent `#15803d` on near-black `#020817`) + system-sans + restrained motion."

**Style governed by `DESIGN.md` (single source of truth)** — per AGENTS.md, use its frontmatter tokens exactly, mapped into Tailwind v4 `@theme` in `globals.css`:

- **Colors:** `accent #15803d`, `primary #020817` (near-black bg), `surface #059669`, `background #ffffff`, `border #dcfce7`, `on-primary #ffffff`, `text #ffffff`, `text-muted #020817`.
- **Typography:** system-sans stack; display 36px/700/1.11/-0.9px, heading 30px/700/1.2/-0.75px, body 14px/500/1.43.
- **Radius:** lg 16px, md 12px, sm 10px, pill 9999px.
- **Shadows:** exact `card` and `elevated` shadow values from frontmatter.
- **Motion:** fast 150ms / base 1000ms / slow 2000ms, easing `cubic-bezier(0.4, 0, 0.2, 1)`.
- **Spacing scale:** base 8px → [8,16,24,32,48,64].
- **Breakpoints:** 640, 641, 768, 1024, 1025, 1280, 1400, 1440.

**Theme:** dark-first default (near-black camera-friendly framing), light-variant (white + `#dcfce7`). Respect `prefers-color-scheme`.

**Dials:** VARIANCE 6 / MOTION 6 / DENSITY 4. Follow `design-taste-frontend`: one accent locked site-wide, WCAG AA contrast on all controls, tactile `:active` states, real images (not div-Placeholder), empty/loading/error states, no AI-purple defaults.

## Architecture Decisions

- **Dark-first, light-variant theme** — matches DESIGN.md color story and suits a fullscreen camera UI.
- **Design tokens as Tailwind v4 `@theme` vars** in `globals.css`, straight from DESIGN.md frontmatter.
- **Mock fallback** — when `N8N_WEBHOOK_URL` is unset, `lib/analysis.ts` routes to `lib/mock.ts` returning a deterministic, zod-validated result. When set, it POSTs to N8N. Same code path exercised either way.
- **Frontend uploads image to Supabase Storage first**, then sends the resulting `imageUrl` + a small base64 thumbnail to the N8N webhook. Keeps webhook payload small and aligns with the `<1MB` image constraint.
- **Single-user passport** — no auth, no device-ID scoping. History reads directly from Supabase (`SELECT … ORDER BY created_at DESC LIMIT 10`). N8N GET `/history` documented as an optional alternative.
- **Weather context optional**: geolocation requested only on user grant; coords are nullable. N8N calls OpenWeatherMap only when coords are present, otherwise prompt placeholders render `"N/A"`.
- **Free OpenRouter model** (default `google/gemma-4-31b-it:free`, configurable via env; fallback `openrouter/free` auto-router). Model IDs are volatile on OpenRouter — read from env, never hardcoded in the N8N JSON body.
- **Strict JSON validation** — `lib/types.ts` defines the `PlantAnalysis` zod schema; `lib/analysis.ts` parses/validates the AI response before the UI consumes it, with graceful error handling on invalid output.
- **Per-scan chat threads** — `chat_messages` rows keyed by scan id; the N8N `/chat` webhook carries scan context + prior messages.

## Frontend Structure

```
src/
  app/
    layout.tsx            # fonts, theme, metadata
    page.tsx              # SPA shell (single client page, camera-first)
    globals.css           # @theme design tokens (DESIGN.md), dark-first + light variant
  components/
    camera/CameraView.tsx     # fullscreen react-webcam + gallery upload
    light/LightMeter.tsx      # real-luminance overlay visualizer
    scan/AnalysisResult.tsx   # parsed JSON → structured cards
    passport/PlantPassport.tsx# history list from Supabase
    doctor/PlantDoctorChat.tsx# per-scan chat thread
    StateMachine.tsx          # idle→uploading→analyzing→result (Motion transitions)
    ui/*                      # shadcn/ui primitives (button, card, badge, sheet, textarea, …)
  lib/
    config.ts        # env parsing (webhook, supabase, openrouter model ids)
    compress.ts      # canvas resize + JPEG <1MB base64
    luminance.ts     # average brightness from ImageData
    supabase.ts      # client + storage upload
    analysis.ts      # N8N POST + zod validation
    mock.ts          # deterministic mock when backend unset
    types.ts         # PlantAnalysis zod schema + chat types
  hooks/
    useGeolocation.ts# optional coords, graceful denial
```

## Data Model (Supabase)

**`plants`** (passport rows):
`id` uuid pk, `created_at` timestamptz, `image_url` text, `name` text, `scientific_name` text, `confidence` numeric, `health_status` text, `diagnosis` text, `needs_water` bool, `needs_medicine` bool, `light_current` text, `light_recommendation` text, `care_watering` text, `care_soil` text, `toxicity` text, `environmental_impact` text, `fun_fact` text, `analysis_json` jsonb, `lat` float8 null, `lng` float8 null, `temp` float4 null, `humidity` float4 null.

**`chat_messages`**: `id` uuid pk, `scan_id` uuid fk → plants.on delete cascade, `role` text, `content` text, `created_at` timestamptz.

**Storage bucket**: `plant-photos` (public read for passport thumbnails).

## Environment (.env.local)

```
N8N_WEBHOOK_URL=           # unset → mock mode
N8N_CHAT_WEBHOOK_URL=      # unset → chat mock
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_BUCKET=plant-photos
OPENROUTER_MODEL=google/gemma-4-31b-it:free
OPENROUTER_MODEL_CHAT=google/gemma-4-31b-it:free
```

## Task List

### Phase 1: Foundation
- [ ] Task 1: Project setup — deps (`motion`, `react-webcam`, `@supabase/supabase-js`, `@supabase/ssr`, `zod`, shadcn/ui init + primitives, `cva`, `clsx`, `tailwind-merge`), shadcn config, `lib/utils`.
- [ ] Task 2: Design system — DESIGN.md tokens into Tailwind v4 `@theme` in `globals.css`; dark-first + light variant; base layout + metadata.

### Checkpoint: Foundation
- [ ] `pnpm build`, `pnpm exec tsc --noEmit`, `pnpm lint` pass
- [ ] Theme renders control in dark + light

### Phase 2: Scan core
- [ ] Task 3: `lib/types.ts` zod schema + `lib/config.ts` env parsing + `lib/compress.ts` image compression.
- [ ] Task 4: `CameraView` (react-webcam fullscreen + gallery upload) + `useGeolocation`.
- [ ] Task 5: `lib/luminance.ts` + `LightMeter` real-brightness visualizer; `StateMachine` idle/uploading/analyzing/result transitions.
- [ ] Task 6: `lib/supabase.ts` + `lib/mock.ts` + `lib/analysis.ts` (N8N POST + zod validation + mock routing).

### Checkpoint: Scan flow
- [ ] Full mock scan works end-to-end (capture → compress → light meter → validated result)
- [ ] Camera works in browser; base64 <1MB

### Phase 3: Passport + Chat
- [ ] Task 7: `AnalysisResult` structured cards + Supabase Storage upload + passport row insert.
- [ ] Task 8: `PlantPassport` history list (Supabase read, last 10).
- [ ] Task 9: `PlantDoctorChat` per-scan thread (N8N `/chat` + mock; messages persisted).

### Checkpoint: Passport + Chat
- [ ] New scan appears in passport; chat threads persist; reload keeps history

### Phase 4: Backend + Docs
- [ ] Task 10: N8N setup doc (`N8N_SETUP.md`) + importable workflow JSON (`docs/n8n/`), exact OpenRouter prompt + schema.

### Checkpoint: Complete
- [ ] All acceptance criteria met; build/tsc/lint green
- [ ] Mock mode and (if configured) live mode verified
- [ ] Ready for review

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenRouter free model IDs rotate/deprecate | Med | Model id read from env, never hardcoded; `openrouter/free` fallback documented |
| AI JSON output malformed/partial | Med | zod strict-parse + schema fallback + inline error state |
| iOS camera (webkit getUserMedia) quirks | Med | Fullscreen mobile-first camera; graceful fallback to file upload; test on iOS/Android |
| Supabase/Storage not yet provisioned | Low | Mock mode + graceful errors; tokens via env only |
| N8N not yet configured | Low | Mock mode covers full flow; N8N deliverable included |
| Geolocation permission denied | Low | Coords optional; analysis runs without weather context |

## Open Questions

(none — all decisions captured from clarifying questions)

---

Tracking: task list in `tasks/todo.md`; N8N workflow export in `docs/n8n/phytoscan-workflow.json`; setup guide `N8N_SETUP.md` at repo root.
