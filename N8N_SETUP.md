# N8N Backend Setup — PhytoScan

PhytoScan uses **N8N** as a lightweight backend orchestrator. N8N exposes two webhooks the app calls, and calls **OpenRouter** (vision LLM) for the AI. Persistence (the Plant Passport + Plant Doctor chat history) is handled directly by the **frontend against Supabase** — N8N does not talk to Supabase. N8N's only job is: receive scan/chat payload → call the model → return cleaned JSON.

There are two workflows (both live in `docs/n8n/`):

| Workflow | Import file | HTTP Method / Path | Purpose |
|---|---|---|---|
| Analyze | `phytoscan-analyze.workflow.json` | `POST /phytoscan-analyze` | Identify + assess a plant from a photo (+ optional local weather) |
| Plant Doctor Chat | `phytoscan-chat.workflow.json` | `POST /phytoscan-chat` | Multi-turn follow-up Q&A about a scan |

> The `*workflow.json` files are **manual hand-authored imports**. Node `typeVersion` values target a recent n8n (1.5x+). If an import is rejected, re-create the workflow in the editor and adjust `typeVersion` / node types to match your installed version — the node wiring is documented below.

---

## 1. Prerequisites

- An **N8N** instance (self-hosted Docker or n8n.cloud) reachable from your app's browser environment (must be HTTPS if the app is served over HTTPS).
- An **OpenRouter** account + API key (free vision models: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`, `google/gemma-4-31b-it:free`, `minimax/minimax-m3:free`).
- Optional — an **OpenWeatherMap** API key (free tier) to enrich scans with local weather when the user grants location.
- A **Supabase** project (Postgres + Storage) for the Plant Passport + chat history. See `docs/supabase/schema.sql`.

---

## 2. Environment variables (app, `.env`)

```bash
# The webhooks are called from the browser, so they use the NEXT_PUBLIC_ prefix
# (Next.js only exposes those to client code). Leave blank to show a clear
# "not configured" error instead of returning placeholder data.
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n.example.com/webhook/phytoscan-analyze
NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL=https://your-n8n.example.com/webhook/phytoscan-chat

# Supabase (client-side only — safe to expose; RLS protects the tables)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_BUCKET=plant-photos

# Informational only — the model is hardcoded in the n8n OpenRouter node
# (see "Credentials" section). The frontend never reads these.
OPENROUTER_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
OPENROUTER_MODEL_CHAT=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
```

> **Unconfigured webhooks:** if `NEXT_PUBLIC_N8N_WEBHOOK_URL` is left blank, scans raise a clear "not configured" error and return to the camera screen. Likewise, blank `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL` makes Plant Doctor chat show an error instead of replying. There is no mock/demo data fallback — real errors and states are surfaced.

---

## 3. Credentials (instead of environment variables)

> **n8n cloud blocks `$env`.** n8n 2.x defaults `N8N_BLOCK_ENV_ACCESS_IN_NODE=true`, and on n8n **cloud** you cannot change it (the error literally says to ask the administrator). So the workflows never use `$env` — secrets live in **n8n credentials**, and non-secret values (model IDs) are hardcoded in the nodes.

Create these credentials (n8n dashboard → **Credentials → Add**):

| Credential type | Name | Purpose | Fields |
|---|---|---|---|
| **Query Auth** | `OpenWeatherMap API key` (optional) | Weather node appid | Name: `appid`, Value: your OpenWeather key |
| **Header Auth** | `OpenRouter API key` | OpenRouter auth | Name: `Authorization`, Value: `Bearer sk-or-...` |

Header Auth adds an `Authorization` header automatically; the `X-Title`/`PhytoScan App` header is already baked into the node. The model is `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` (vision-capable) hardcoded in the OpenRouter body — change it there if you want a different model.

---

## 4. Import the workflows

1. n8n dashboard → **Workflows** → **⋮ menu** → **Import from File**.
2. Import `docs/n8n/phytoscan-analyze.workflow.json` and `docs/n8n/phytoscan-chat.workflow.json`.
3. Open each workflow and attach the credentials: on the **OpenRouter** nodes select the `OpenRouter API key` (Header Auth) credential; on the **Weather** node select the `OpenWeatherMap API key` (Query Auth) credential. Credentials are referenced by name/id on `httpHeaderAuth` / `httpQueryAuth` in the imported JSON — re-select them if n8n flags them as missing.
4. Click **Active** toggle to turn it on, or **Execute Workflow** to test. The production webhook URL is `…/webhook/phytoscan-analyze` (or `…/webhook-test/…` while testing — use the `webhook-test` path in the app only for dev).

---

## 5. Workflow: Analyze (`phytoscan-analyze`)

Node chain:

```
Webhook (POST, path=phytoscan-analyze)
  │
  ├─ Resolve image (Code: normalizes payload → `url` (https) or `dataUrl` (base64 `data:` URI);
  │      accepts `imageUrl` or legacy `base64Image`; passes lat/lng through)
  ├─ Has location? (If: lat & lng not empty)
  │     ├─ Weather (OpenWeather GET, lat/lon + Query Auth appid)  → Merge (input 0)
  │     └─ false → Merge (input 1)
  │
  ├─ Merge (append: weather first, webhook fallback)
  ├─ Fetch image (HTTP Request → File: downloads the image URL in n8n, no provider URL-fetching; never fails the run)
  ├─ Encode image (Code: resolves the binary buffer via `this.helpers.getBinaryDataBuffer()` — required because n8n cloud stores binary as `filesystem-v2` references, not inline base64 — then emits a `data:` URI; or passes a `dataUrl` through)
  ├─ Build context (Code: builds `messages[]` embedding the image as a data URI, plus env data — no env-var access here)
  ├─ OpenRouter (POST /api/v1/chat/completions, Header Auth credential, body = `={{ JSON.stringify({ model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', messages: $json.messages }) }}`)
  ├─ Clean result (Code: strip fence, JSON.parse → { analysis, temp, humidity, … })
  └─ Respond to Webhook ({ analysis, temp, humidity })
```

> **No `$env` anywhere — by design.** n8n 2.x's Code-node task runner blocks `process` (`process is not defined`), and n8n cloud blocks `$env` in expressions (`access to env vars denied`, `N8N_BLOCK_ENV_ACCESS_IN_NODE`). Secrets go in n8n credentials (Header Auth / Query Auth); the `messages[]` array is built in the Code node and interpolated into the OpenRouter body via `$json.messages`. The Plant Doctor chat workflow follows the same pattern.

**Webhook payload (from the app):** The image travels as a **URL only** — a public Supabase Storage URL, or the base64 `data:` URL when Supabase is unconfigured.

```json
{
  "imageUrl": "https://.../public-image",
  "lat": 12.34,
  "lng": 56.78
}
```

**Response (to the app):**

```json
{
  "analysis": {
    "identification": { "name": "...", "scientific_name": "...", "confidence": "..." },
    "health_assessment": { "status": "Healthy|Warning|Critical", "diagnosis": "...", "needs_water": true, "needs_medicine": false },
    "light_analysis": { "current_light": "...", "recommendation": "..." },
    "care_instructions": { "watering_frequency": "...", "soil_type": "...", "toxicity": "..." },
    "environmental_impact": "...",
    "fun_fact": "..."
  },
  "temp": 21.5,
  "humidity": 60
}
```

The app validates this against its zod `PlantAnalysisSchema` before rendering.

---

## 6. Workflow: Plant Doctor Chat (`phytoscan-chat`)

Node chain:

```
Webhook (POST, path=phytoscan-chat)
  → Resolve image (Code: normalize `imageUrl`/`base64Image` → `url` or `dataUrl`)
  → Fetch image (HTTP Request → File, never fails the run)
  → Encode image (Code: `getBinaryDataBuffer()` → `data:` URI, or `dataUrl` passthrough)
  → Build chat payload (Code: OpenRouter messages from message + history + image)
  → OpenRouter (POST /api/v1/chat/completions)
  → Extract reply (Code: choices[0].message.content / reasoning)
  → Respond to Webhook ({ reply })
```

**Webhook payload (from the app):**

```json
{
  "scanId": "uuid-of-the-scan",
  "imageUrl": "https://.../public-image",
  "message": "How often should I water it?",
  "history": [ { "role": "user", "content": "..." }, { "role": "assistant", "content": "..." } ]
}
```

**Response:** `{ "reply": "…the assistant's answer…" }`

The chat **history and messages are persisted to Supabase by the frontend** (see `chat_messages` table in `docs/supabase/schema.sql`). N8N is stateless here.

---

## 7. Supabase

Run `docs/supabase/schema.sql` in the Supabase SQL editor. It creates:

- `plants` — one row per scan (Plant Passport).
- `chat_messages` — one row per chat message, threaded by `scan_id`.

Then create a **public Storage bucket** named `plant-photos` (matching `NEXT_PUBLIC_SUPABASE_BUCKET`). The app uploads each scan photo there and stores the public URL in `plants.image_url`, which is also what the chat workflow is handed as `imageUrl`.

Row Level Security is enabled with permissive anonymous policies (single-user app, anon key only). If you later add auth, tighten these policies.

---

## 8. How to test end-to-end

1. `pnpm dev` (with `NEXT_PUBLIC_N8N_WEBHOOK_URL` set; without it, scans fail with a clear "not configured" error instead of demo data).
2. Send a real scan: allow camera, capture, let it upload to Supabase Storage, then watch the Analyze webhook fire in n8n and the result render.
3. Open the Plant Passport and the Plant Doctor chat to confirm persistence + follow-up answers.
