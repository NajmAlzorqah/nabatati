# نباتاتي · nabatati

📸 Identify a plant from a photo, get a health check and care guide, then ask an AI plant doctor. Arabic-first RTL PWA.

**[Live demo →](https://nabatati.vercel.app)**

[![license](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![next](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![pwa](https://img.shields.io/badge/PWA-installable-purple)](https://developer.mozilla.org/docs/Web/Progressive_web_apps)

## Features

- **Identification** — common and scientific name with a confidence score
- **Health check** — healthy / warning / critical, with a diagnosis
- **Care guide** — watering, soil, light, and pet toxicity
- **Light meter** — real luminance computed from the captured frame
- **Plant Passport** — every scan saved to a browsable history
- **Plant Doctor** — multi-turn AI chat scoped to one scan
- **Installable PWA** — offline fallback, Arabic RTL throughout
- **No backend required** — falls back to `localStorage` if unconfigured

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Motion · Zod
n8n (AI orchestration) · Supabase (persistence) · NVIDIA Nemotron / OpenRouter

## Quick start

Requires **Node.js ≥ 20.9** and **pnpm**.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

| Variable | Required | Description |
|---|:---:|---|
| `NEXT_PUBLIC_N8N_WEBHOOK_URL` | yes | Analyze webhook URL. |
| `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL` | yes | Plant Doctor chat webhook URL. |
| `NEXT_PUBLIC_SUPABASE_URL` | no | Blank → `localStorage` mode. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no | Safe to expose; RLS protects the tables. |
| `NEXT_PUBLIC_SUPABASE_BUCKET` | no | Photo bucket. Defaults to `plant-photos`. |

Unset webhook URLs surface a clear "not configured" error — there is no mock-data fallback by design.

### Backend (n8n)

AI runs behind two n8n webhooks. Both workflow files are in [`docs/n8n/`](./docs/n8n) and import directly.

Requires **n8n 2.22+** (the NVIDIA Nemotron node landed in 2.22.0). Create these credentials first:

| Type | Purpose |
|---|---|
| NVIDIA Nemotron | Primary model — key from [build.nvidia.com](https://build.nvidia.com) |
| OpenRouter | Fallback model — key `sk-or-…` |
| Query Auth | Optional — OpenWeatherMap key as `appid` for local weather |

Then: **Workflows → ⋮ → Import from File**, import both JSON files, attach the credentials to each node, and toggle **Active**.

Secrets live in n8n credentials, never in env vars — n8n Cloud blocks `$env` access. Both chat models use `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`; you only need one provider. NVIDIA is wired to the agent's Chat Model slot and OpenRouter to Fallback — drag a node onto the other slot to flip which one answers.

The agent's system prompts are Arabic and return a fixed JSON shape matching the Zod schema in `src/lib/types.ts`. If you change one, change the other.

### Supabase (optional)

Run [`docs/supabase/schema.sql`](./docs/supabase/schema.sql) in the SQL editor, then create a **public** storage bucket named `plant-photos`.

Note that the shipped RLS policies are permissive (`using (true)`) since this is built for a single user. Anyone who deploys it with their own project can read and write your tables and photos until you add auth — treat the anon key as public.

## Deploying

Import the repo into Vercel; the default Next.js preset works as-is. Add the five env vars above and deploy.

Deploying anywhere else that runs Next.js also works, as long as the webhook is reachable over HTTPS and CORS allows your origin.

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` — run a build once first, Next generates the route prop types |

Testing the camera on a real phone over Wi-Fi? Add your LAN IP to `allowedDevOrigins` in `next.config.ts`, then open `http://<your-ip>:3000`.

## License

[MIT](./LICENSE) © 2026 Najm Alzorqah
