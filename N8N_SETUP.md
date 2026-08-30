# N8N Backend Setup — PhytoScan

PhytoScan uses **N8N** as a lightweight backend orchestrator. N8N exposes two webhooks the app calls, and each workflow uses an **n8n AI Agent** backed by a vision chat model. Two model providers are available and are **switched manually in the n8n editor** (the app itself never selects a provider):

- **NVIDIA Nemotron** (`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`) — wired as the **primary** Chat Model.
- **OpenRouter** (same model ID, routed through OpenRouter) — wired as the **Fallback** model slot.

Persistence (the Plant Passport + Plant Doctor chat history) is handled directly by the **frontend against Supabase** — N8N does not talk to Supabase. N8N also keeps a per-scan **memory** (Simple Memory sub-node) so the Plant Doctor holds conversation context across turns within a scan.

There are two workflows (both live in `docs/n8n/`):

| Workflow | Import file | HTTP Method / Path | Purpose |
|---|---|---|---|
| Analyze | `phytoscan-analyze.workflow.json` | `POST /phytoscan-analyze` | Identify + assess a plant from a photo (+ optional local weather) |
| Plant Doctor Chat | `phytoscan-chat.workflow.json` | `POST /phytoscan-chat` | Multi-turn follow-up Q&A about a scan |

> **Requires n8n 2.22+** (the NVIDIA Nemotron Chat Model node shipped in n8n 2.22.0). The OpenRouter Chat Model node requires n8n 1.77+.
>
> The `*workflow.json` files are **manual hand-authored imports**. If an import is rejected, re-create the workflow in the editor and adjust `typeVersion` / node types to match your installed version — the node wiring is documented below.

---

## 1. Prerequisites

- An **N8N** instance (**version 2.22 or newer** — self-hosted Docker or n8n.cloud) reachable from your app's browser environment (must be HTTPS if the app is served over HTTPS).
- An **OpenRouter** account + API key (may be blank if you only use NVIDIA).
- An **NVIDIA** account + API key from [build.nvidia.com](https://build.nvidia.com) (may be blank if you only use OpenRouter).
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

# Informational only — the model is hardcoded in the n8n NVIDIA Nemotron node
# ("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"). The frontend never reads these.
OPENROUTER_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
OPENROUTER_MODEL_CHAT=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
```

> **Unconfigured webhooks:** if `NEXT_PUBLIC_N8N_WEBHOOK_URL` is left blank, scans raise a clear "not configured" error and return to the camera screen. Likewise, blank `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL` makes Plant Doctor chat show an error instead of replying. There is no mock/demo data fallback — real errors and states are surfaced.

---

## 3. Credentials (instead of environment variables)

> **n8n cloud blocks `$env`.** n8n 2.x defaults `N8N_BLOCK_ENV_ACCESS_IN_NODE=true`, and on n8n **cloud** you cannot change it. So the workflows never use `$env` — secrets live in **n8n credentials**, and non-secret values (model IDs) are hardcoded in the nodes.

Create these credentials (n8n dashboard → **Credentials → Add**):

| Credential type | Name | Purpose | Fields |
|---|---|---|---|
| **Query Auth** | `OpenWeatherMap API key` (optional) | Weather node appid | Name: `appid`, Value: your OpenWeather key |
| **NVIDIA Nemotron** | `NVIDIA Nemotron` | NVIDIA chat model auth | Base URL: `https://integrate.api.nvidia.com/v1` (default), API Key: your build.nvidia.com key |
| **OpenRouter API** | `OpenRouter` | OpenRouter chat model auth | API Key: `sk-or-...`, URL: `https://openrouter.ai/api/v1` |

The **NVIDIA Nemotron** node uses its `nvidiaApi` credential (fields: `url`, `apiKey`); the **OpenRouter Chat Model** node uses its `openRouterApi` credential (fields: `apiKey`, `url`). Both point at OpenAI-compatible endpoints, so they plug straight into the AI Agent's Chat Model / Fallback Model slots.

---

## 4. Import the workflows

1. n8n dashboard → **Workflows** → **⋮ menu** → **Import from File**.
2. Import `docs/n8n/phytoscan-analyze.workflow.json` and `docs/n8n/phytoscan-chat.workflow.json`.
3. Open each workflow and attach the credentials: on the **NVIDIA Nemotron Chat Model** node select the `NVIDIA Nemotron` (nvidiaApi) credential; on the **OpenRouter Chat Model** node select the `OpenRouter` (openRouterApi) credential; on the **Weather** node select the `OpenWeatherMap API key` (Query Auth) credential. Credentials are referenced by name on the nodes in the imported JSON — re-select them if n8n flags them as missing.
4. Click **Active** toggle to turn it on, or **Execute Workflow** to test. The production webhook URL is `…/webhook/phytoscan-analyze` (or `…/webhook-test/…` while testing — use the `webhook-test` path in the app only for dev).

### Switching between NVIDIA and OpenRouter

Both providers are wired to each AI Agent. The **NVIDIA Nemotron Chat Model** is the primary **Chat Model** input; the **OpenRouter Chat Model** is the **Fallback Model** input (used automatically if the primary errors). To switch which one actually answers, drag the other node onto the **Chat Model** slot (and the first one onto the **Fallback** slot) in the editor. The model ID is `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` on both nodes — edit it per-node if you want different models per provider.

---

## 5. Workflow: Analyze (`phytoscan-analyze`)

Node chain (AI Agent based):

```
Webhook (POST, path=phytoscan-analyze)
  → Resolve image (Code: normalizes payload → `url` (https) or `dataUrl` (base64 `data:` URI);
        accepts `imageUrl` or legacy `base64Image`; computes a per-scan `scanId` for memory)
  → Has location? (If: lat & lng not empty)
        ├─ Weather (OpenWeather GET, lat/lon + Query Auth appid) → Merge (input 0)
        └─ false → Merge (input 1)
  → Merge (append: weather first, webhook fallback)
  → Prepare agent input (Code: builds `chatInput` text with weather + instructions)
  → Fetch image (HTTP Request → File: downloads the image URL, never fails)
  → Prepare binary image (Code: if the payload was a base64 `data:` URL, converts it to a
        binary image for the agent; otherwise keeps the fetched binary)
  → AI Agent (Chat Model = NVIDIA Nemotron · Fallback = OpenRouter · Memory = Simple Memory
        keyed by scanId · Structured Output Parser = PlantAnalysis schema)
  → Clean result (Code: unwraps parsed `output` → { analysis, temp, humidity })
  → Respond to Webhook ({ analysis, temp, humidity })
```

> The image reaches the model via the AI Agent's **"Automatically Passthrough Binary Images"** option (default on) — no base64 `data:` URI embedding and no `$env` anywhere. Secrets sit in the `nvidiaApi` / `openRouterApi` credentials; the model ID is hardcoded on the NVIDIA node.

**Structured Output Parser config (n8n ≥ 1.3):** set **Schema Type = From JSON** and paste a **JSON string** (an example *instance* of the PlantAnalysis shape, e.g. `{"identification":{"name":"...","scientific_name":"...","confidence":"High"}, ...}`) into `jsonSchemaExample` — n8n `JSON.parse`s this string to infer the schema and forces every field required. Because n8n 1.3 wraps the schema in an `output` key, the agent's **system message instructs the model to return `{"output": { ...assessment... }}`**, and `Clean result` unwraps that `output` key before responding. If the model's JSON ever fails to match, the parser throws the "Error in sub-node Structured Output Parser" — check that (a) `jsonSchemaExample` is a valid JSON string (not an object), and (b) the model is wrapping its answer in `output`.

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

Node chain (AI Agent based):

```
Webhook (POST, path=phytoscan-chat)
  → Resolve image (Code: normalize `imageUrl`/`base64Image` → `url` or `dataUrl`; keep scanId/message/history)
  → Prepare agent input (Code: builds `chatInput` from the current message + frontend-supplied history as a fallback)
  → Fetch image (HTTP Request → File, never fails)
  → Prepare binary image (Code: converts a base64 `data:` URL to binary, or keeps the fetched binary)
  → AI Agent (Chat Model = NVIDIA Nemotron · Fallback = OpenRouter · Memory = Simple Memory
        keyed by scanId)
  → Extract reply (Code: reads the agent's `output` → { reply })
  → Respond to Webhook ({ reply })
```

**Memory:** The **Simple Memory** sub-node (`memoryBufferWindow`) is keyed by `scanId` (`sessionKey: ={{ $json.scanId }}`). Because the app sends the same `scanId` for every follow-up in a scan, n8n holds the conversation across turns on its own. The chat **history is still persisted to Supabase by the frontend** (see `chat_messages` table in `docs/supabase/schema.sql`) for the app's own UI / reload; n8n's memory is an independent in-workflow store.

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

The chat **history and messages are persisted to Supabase by the frontend** (see `chat_messages` table in `docs/supabase/schema.sql`) for the app's UI and reload. In addition, the workflow's **Simple Memory** node keeps a per-scan conversation buffer inside n8n so the AI Agent has context across turns within a scan.

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
