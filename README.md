<div align="right" dir="rtl">

# نباتاتي — nabatati

**صوّر نبتة لتحديد نوعها وتقييم صحّتها والحصول على إرشادات العناية المناسبة — رفيق صحة نباتاتك على هاتفك.**

An Arabic-first, RTL **Progressive Web App**. Point your phone camera at any plant and get back its species, a health assessment, care instructions, and a follow-up AI chat about it.

[Live demo → nabatati.vercel.app](https://nabatati.vercel.app)

</div>

---

## Features

- **Plant identification** — common name, scientific name, and a confidence percentage from a single photo.
- **Health assessment** — healthy / warning / critical, with a written diagnosis and water/medication flags.
- **Care instructions** — watering frequency, soil type, light needs, and pet toxicity.
- **Environmental impact + fun fact** for every plant scanned.
- **Light meter** — a real luminance readout computed from the captured frame, not a placeholder.
- **Plant Passport** — every scan is saved to a browsable history grid.
- **Plant Doctor chat** — multi-turn follow-up Q&A about a specific scan (pests, treatment, watering).
- **Installable PWA** — offline fallback, standalone display, maskable icons, and an Arabic RTL layout throughout.
- **Runs without a backend** — falls back to `localStorage` so you can try the UI before wiring up Supabase.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 · React Compiler |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui + Motion |
| AI backend | n8n workflows → NVIDIA Nemotron (primary) / OpenRouter (fallback) |
| Persistence | Supabase (Postgres + Storage), `localStorage` fallback |
| Validation | Zod |
| Icons | Lucide |

## Quick start

Requires **Node.js ≥ 20.9** and **pnpm**.

```bash
pnpm install
cp .env.example .env.local   # then fill in your own values
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

> With the webhook URLs left blank, scans surface a clear **"not configured"** error. There is no mock/demo-data fallback — real errors and states are shown on purpose.

### Environment variables

| Variable | Required | Purpose |
|---|:---:|---|
| `NEXT_PUBLIC_N8N_WEBHOOK_URL` | yes | The analyze webhook. Without it, scanning is disabled. |
| `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL` | yes | The Plant Doctor chat webhook. |
| `NEXT_PUBLIC_SUPABASE_URL` | no | Supabase project URL. Blank → `localStorage` mode. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no | Supabase anon key. Safe to expose; RLS protects the tables. |
| `NEXT_PUBLIC_SUPABASE_BUCKET` | no | Storage bucket for scan photos. Defaults to `plant-photos`. |

The webhooks are called from the browser, hence the `NEXT_PUBLIC_` prefix — Next.js only exposes those to client code.

---

## Backend setup (n8n)

The app is frontend-only. The AI lives behind two n8n webhooks, each driven by an **n8n AI Agent** node with a vision chat model.

> **Requires n8n 2.22+** — the NVIDIA Nemotron Chat Model node shipped in n8n 2.22.0. The OpenRouter Chat Model node requires n8n 1.77+.
>
> The `*workflow.json` files are **hand-authored imports**. If your n8n rejects an import, rebuild the workflow in the editor and match the node `typeVersion` values to your installed version.

### 1. Credentials

> **n8n cloud blocks `$env`.** n8n 2.x defaults `N8N_BLOCK_ENV_ACCESS_IN_NODE=true`, and on **cloud** you cannot change it. So these workflows never use `$env` — secrets live in **n8n credentials**, and non-secret values (the model ID) are hardcoded on the nodes.

Create these in **Credentials → Add**:

| Type | Name | Fields |
|---|---|---|
| NVIDIA Nemotron | `NVIDIA Nemotron` | Base URL `https://integrate.api.nvidia.com/v1`, API key from [build.nvidia.com](https://build.nvidia.com) |
| OpenRouter API | `OpenRouter` | API key `sk-or-…`, URL `https://openrouter.ai/api/v1` |
| Query Auth | `OpenWeatherMap API key` *(optional)* | Name `appid`, Value your OpenWeather key |

Both chat models use `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`. You only need **one** of the two providers — NVIDIA's key is free, OpenRouter is the fallback.

### 2. Import and activate

1. **Workflows → ⋮ menu → Import from File**.
2. Import `docs/n8n/nabatati-analyze.workflow.json` and `docs/n8n/nabatati-chat.workflow.json`.
3. Attach credentials on each node: **NVIDIA Nemotron Chat Model** → `NVIDIA Nemotron`; **OpenRouter Chat Model** → `OpenRouter`; **Weather** → `OpenWeatherMap API key`. Credentials are referenced by name in the JSON, so re-select them if n8n flags them missing.
4. Toggle **Active** (or **Execute Workflow** to test). The production URL is `…/webhook/nabatati-analyze`; while testing n8n serves `…/webhook-test/nabatati-analyze` — use the `webhook-test` path in the app only for local dev.

**Switching providers:** the NVIDIA node is wired to the agent's **Chat Model** slot and OpenRouter to **Fallback Model** (used automatically if the primary errors). To flip which one answers, drag the other node onto the Chat Model slot in the editor.

### 3. Workflow: Analyze (`nabatati-analyze`)

```
Webhook (POST, path=nabatati-analyze)
  → Resolve image        Code: normalizes the payload to `url` (https) or `dataUrl`
                         (base64); computes a per-scan `scanId` for memory
  → Has location?        If: lat & lng are not empty
        ├─ Weather       OpenWeather GET (lat/lon + appid)  → Merge
        └─ false         → Merge
  → Merge                append: weather first, webhook fallback
  → Prepare agent input  Code: builds `chatInput` with weather + instructions
  → Fetch image          HTTP Request → File
  → Prepare binary image Code: base64 data-URL → binary, else keep the fetched binary
  → AI Agent             Chat Model = NVIDIA · Fallback = OpenRouter
                         Memory = Simple Memory keyed by scanId
                         Structured Output Parser = PlantAnalysis schema
  → Clean result         Code: unwraps parsed `output` → { analysis, temp, humidity }
  → Respond to Webhook   { analysis, temp, humidity }
```

The image reaches the model via the AI Agent's **"Automatically Passthrough Binary Images"** option (on by default) — no base64 embedding.

**Structured Output Parser:** set **Schema Type = From JSON** and paste a JSON **string** (an example *instance* of the shape) into `jsonSchemaExample`. n8n wraps the result in an `output` key, which is why the agent's system message instructs the model to return `{"output": { … }}` and `Clean result` unwraps it. If parsing fails with *"Error in sub-node Structured Output Parser"*, check that `jsonSchemaExample` is a valid JSON **string** (not an object) and that the model wrapped its answer in `output`.

**Request** (from the app — the image travels as a **URL only**, either a public Supabase Storage URL or a base64 `data:` URL when Supabase is unconfigured):

```json
{ "imageUrl": "https://…/public-image", "lat": 12.34, "lng": 56.78 }
```

**Response:**

```json
{
  "analysis": {
    "identification":   { "name": "…", "scientific_name": "…", "confidence": "…" },
    "health_assessment":{ "status": "صحي|إنذار|حرج", "diagnosis": "…",
                          "needs_water": true, "needs_medicine": false },
    "light_analysis":   { "current_light": "…", "recommendation": "…" },
    "care_instructions":{ "watering_frequency": "…", "soil_type": "…",
                          "toxicity": "آمن للحيوانات الأليفة|سام للحيوانات الأليفة" },
    "environmental_impact": "…",
    "fun_fact": "…"
  },
  "temp": 21.5,
  "humidity": 60
}
```

`temp`/`humidity` are `null` when the user declines location. The app validates the response against its Zod `PlantAnalysisSchema` before rendering.

### 4. Workflow: Plant Doctor Chat (`nabatati-chat`)

```
Webhook (POST, path=nabatati-chat)
  → Resolve image        Code: normalize to `url`/`dataUrl`; keep scanId/message/history
  → Prepare agent input  Code: builds `chatInput` from the message + supplied history
  → Fetch image          HTTP Request → File
  → Prepare binary image Code: base64 data-URL → binary, else keep the fetched binary
  → AI Agent             Chat Model = NVIDIA · Fallback = OpenRouter
                         Memory = Simple Memory keyed by scanId
  → Extract reply        Code: reads `output` → { reply }
  → Respond to Webhook   { reply }
```

**Request:**

```json
{
  "scanId": "uuid-of-the-scan",
  "imageUrl": "https://…/public-image",
  "message": "How often should I water it?",
  "history": [{ "role": "user", "content": "…" }, { "role": "assistant", "content": "…" }]
}
```

**Response:** `{ "reply": "…" }`

**On memory:** the **Simple Memory** sub-node is keyed by `scanId`, so because the app sends the same `scanId` for every follow-up in a scan, n8n holds the conversation across turns on its own. Separately, the **frontend persists** history to the Supabase `chat_messages` table for its own UI and reload. These are two independent stores.

### 5. Arabic-first prompts

Both workflows are fully Arabic and were designed so the AI's output matches the app's Zod schema exactly:

- System messages instruct the agent to answer in Modern Standard Arabic.
- `status` must be exactly one of `صحي` / `إنذار` / `حرج`.
- `toxicity` must be exactly one of `آمن للحيوانات الأليفة` / `سام للحيوانات الأليفة`.
- `confidence` is a string ending in `%`.
- `needs_water` and `needs_medicine` are JSON booleans.
- The whole assessment is returned as a single JSON object under the `output` key — no Markdown, no code fences, no preamble.

If you edit the prompts, keep the `src/lib/types.ts` schema and the Structured Output Parser in sync.

---

## Supabase (optional but recommended)

Run `docs/supabase/schema.sql` in the Supabase SQL editor. It creates:

- **`plants`** — one row per scan (the Plant Passport).
- **`chat_messages`** — one row per chat message, threaded by `scan_id`.

Then create a **public Storage bucket** named `plant-photos` (must match `NEXT_PUBLIC_SUPABASE_BUCKET`). The app uploads each scan photo there and stores the public URL in `plants.image_url` — which is also what the chat workflow receives as `imageUrl`.

> ⚠️ **Security note.** `docs/supabase/schema.sql` enables Row Level Security with **permissive anonymous policies** (`using (true)`), which is appropriate for a single-user self-hosted setup. If you deploy this with your own Supabase project, **anyone on the internet can read and write your tables and your photos** until you add auth and tighten those policies. Treat the anon key as public, not secret.

---

## Project structure

```
src/
  app/                      Next.js App Router (layout, PWA manifest, icons, offline)
  components/
    App.tsx                 screen state machine + shell
    camera/                 fullscreen react-webcam capture + gallery upload
    light/                  real-luminance light meter overlay
    scan/                   structured result cards
    passport/               scan history grid
    doctor/                 per-scan Plant Doctor chat thread
    onboarding/             first-run walkthrough
    ui/                     shadcn/ui primitives
  hooks/
    useScanFlow.ts          capture → compress → upload → analyze → persist
    useOnboarding.ts        localStorage-backed onboarding state
    useGeolocation.ts       optional coords, graceful denial
    useNavigation.ts        back-stack between scan and result
  lib/
    config.ts               env access
    analysis.ts             n8n POST + Zod validation + "not configured" guard
    types.ts                PlantAnalysis Zod schema + chat types
    db.ts                   Supabase persistence with localStorage fallback
    supabase.ts             client + storage upload/delete
    compress.ts             canvas resize → JPEG < 1 MB base64
    luminance.ts            average brightness from ImageData
docs/
  n8n/                      importable workflow JSON
  supabase/schema.sql       tables, indexes, RLS policies
public/
  sw.js                    service worker (precache + offline navigation fallback)
  offline.html              offline fallback page
```

### The service worker

`public/sw.js` is deliberately conservative because the app is App-Router based:

- **Precached** — immutable hashed assets under `/_next/static`, the offline page, and core icons (`CacheFirst`).
- **Navigations** — `NetworkFirst`, falling back to `/offline.html` when offline.
- **Everything else** — `NetworkOnly`. RSC/Flight payloads, Supabase, and n8n calls are never cached, because caching dynamic App Router responses breaks navigation.

---

## Development

```bash
pnpm dev         # dev server
pnpm lint        # eslint
pnpm typecheck   # tsc --noEmit  (run pnpm build at least once first —
                 # Next generates the LayoutProps/RouteProps globals into
                 # .next/types, so a bare tsc on a clean clone reports
                 # "Cannot find name 'LayoutProps'")
pnpm build       # production build
pnpm start       # serve the production build
```

**Testing the camera on a real phone over Wi-Fi:** the browser will block the camera on origins that aren't `localhost`. Add your machine's LAN IP to `allowedDevOrigins` in `next.config.ts`, then visit `http://<your-ip>:3000` on the phone.

**Geolocation is optional.** Coordinates are only requested when the user grants permission, and scans work fine without them — n8n just skips the weather lookup and the temperature/humidity fields come back `null`.

## Deploying to Vercel

1. Import the repo at [github.com/NajmAlzorqah/nabatati](https://github.com/NajmAlzorqah/nabatati) into Vercel. The default Next.js preset works as-is.
2. Add the five environment variables above under **Settings → Environment Variables**.
3. Deploy.

The app is fully static and can be hosted anywhere that runs Next.js. Remember the webhook must be reachable over **HTTPS** if the app is served over HTTPS, and CORS must allow your app's origin.

## Testing it end to end

1. `pnpm dev` with `NEXT_PUBLIC_N8N_WEBHOOK_URL` set.
2. Allow camera access, capture a plant, and watch the Analyze webhook fire in n8n.
3. Confirm the result renders, then open the Plant Passport and Plant Doctor chat to verify persistence and follow-up answers.

## License

[MIT](LICENSE) © 2026 Najm Alzorqah
