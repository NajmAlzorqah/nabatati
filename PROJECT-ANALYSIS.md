# PhytoScan — Full Project Analysis

## Purpose

**PhytoScan** is an **Arabic RTL Progressive Web App (PWA)** that lets users point their phone camera at any plant and instantly:

1. **Identify** the plant species (common name, scientific name, confidence %)
2. **Assess its health** (healthy / warning / critical — with a written diagnosis)
3. **Get care instructions** — watering schedule, soil type, light needs, pet toxicity
4. **Understand environmental impact** of the plant
5. **Read a fun fact** about the plant
6. **Chat with a "Plant Doctor"** — a follow-up AI chatbot that answers questions about the scanned plant (pests, treatment, watering, etc.)
7. **Build a personal plant catalog** — all scans are saved locally (or to Supabase) and browsable in a grid

The app is designed primarily for **mobile phones** (portrait, fullscreen PWA) and the entire UI is in **Arabic** with RTL layout.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Next.js 16 App Router (React 19, React Compiler)      │
│  src/app/page.tsx → <App /> (single-page client shell) │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │  Browser (client-side)  │
          └────────────┬────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   ┌────▼────┐   ┌─────▼─────┐  ┌────▼────┐
   │ n8n     │   │ Supabase  │  │ Local   │
   │ Webhooks│   │ Storage + │  │ Storage │
   │ (AI)    │   │ Postgres  │  │ (LS)   │
   └─────────┘   └───────────┘  └─────────┘
```

### Key Technologies

| Layer | Technology |
|---|---|
| Framework | Next.js 16.3, App Router, React 19, React Compiler |
| Styling | Tailwind v4, shadcn/ui, class-variance-authority, motion (Framer) |
| Camera | react-webcam (environment-facing, 1280x720) |
| Validation | Zod v4 (schema for plant analysis response) |
| Backend AI | n8n webhooks (external workflow engine — NVIDIA Nemotron / OpenRouter LLMs) |
| Cloud Storage | Supabase Storage (`plant-photos` bucket) + Supabase Postgres |
| Fallback Storage | localStorage (when Supabase is not configured) |
| PWA | Service worker (`public/sw.js`), Web App Manifest, install prompt |
| Fonts | IBM Plex Sans Arabic (body/heading), Geist Mono |
| Icons | Lucide React |

---

## Environment Variables

Defined in `.env.local` (copy from `.env.example`):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_N8N_WEBHOOK_URL` | n8n endpoint for plant image analysis (POST image → returns JSON analysis) |
| `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL` | n8n endpoint for Plant Doctor follow-up chat |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `NEXT_PUBLIC_SUPABASE_BUCKET` | Storage bucket name (default: `plant-photos`) |

All use `NEXT_PUBLIC_` prefix because they are called from the **browser**, not a server API route.

When Supabase is not configured, the app falls back to **localStorage** for scan and chat persistence. When n8n webhooks are not configured, scans and chats show a clear "not configured" error.

---

## Application Flow (Start to End)

### 1. App Launch

```
index.html → layout.tsx → page.tsx → <App />
```

- `layout.tsx` sets `lang="ar" dir="rtl"`, loads fonts, wraps in `<ThemeProvider>`, adds `<InstallPrompt />`
- `page.tsx` simply renders `<App />`
- `<App />` waits for hydration (`ready` flag) to avoid SSR/client mismatch from localStorage

### 2. Onboarding (First Launch)

If the user has never used the app (no `phytoscan-onboarded` key in localStorage), the **3-step onboarding** screens appear:

| Step | Title | Content |
|---|---|---|
| 1 | اكتشف نباتك | "Take a photo of any plant and we'll identify it" |
| 2 | قيّم حالته | "We analyze health, watering, soil, light, care" |
| 3 | اسأل الطبيب النباتي | "Ask the Plant Doctor anything about your plant" |

- Steps are animated with `motion` (slide transitions)
- User can **skip** or tap **التالي** (Next) / **ابدأ الآن** (Start Now)
- Completion is saved to `localStorage` so onboarding runs only once

### 3. Camera Screen (Home)

After onboarding, the user sees the **full-screen camera view**:

- **Live webcam feed** using `react-webcam` (environment-facing camera, 1280x720)
- A **rounded square frame overlay** guides the user to center the plant
- Three bottom buttons:
  - **ImagePlus** (left) — upload a photo from gallery instead of camera
  - **Camera** (center, large) — capture a photo
  - **BookOpen** (right) — open the Plant Passport (catalog)
- If the camera is unavailable, an error message prompts to upload an image instead

### 4. Scan Flow (Image Capture → Analysis)

When the user captures or uploads an image:

#### Phase: `uploading`
1. **Luminance calculation** — the captured image is downscaled to 48x48 and average brightness is computed (0-1 scale)
2. **Image compression** — the image is resized to max 1280px dimension, JPEG quality is iteratively reduced to stay under **1MB**
3. **Supabase upload** (if configured) — the compressed image is uploaded to the `plant-photos` bucket as `{scanId}.jpg`
4. A **scanning animation** plays (pulsing scan icon over the captured image)

#### Phase: `analyzing`
5. **Geolocation request** — on capture, the browser is asked for GPS coordinates (used for environmental context)
6. **n8n webhook POST** — sends `{ imageUrl, lat, lng }` to the analysis endpoint
7. The n8n workflow runs an LLM (NVIDIA Nemotron) that returns a structured JSON response
8. **Response validation** — the response is coerced through `coerceAnalysis()` and validated against `PlantAnalysisSchema` (Zod)
9. The result is saved to Supabase (or localStorage)
10. **Light meter** is displayed during analysis showing the luminance reading

### 5. Analysis Result Screen

After successful analysis, the result screen shows:

#### Header
- Back button (if navigated from catalog)
- "PhytoScan" brand label
- Dark/Light theme toggle

#### Plant Image
- The captured/uploaded image in a rounded card

#### Analysis Cards (in order):

| Card | Content |
|---|---|
| **Identification** | Plant name, scientific name, confidence %, health badge (green/yellow/red) |
| **Diagnosis** | Health status text, written diagnosis |
| **Watering** | Watering frequency, needs_water boolean |
| **Soil** | Recommended soil type |
| **Light** | Current light condition, recommendation |
| **Toxicity** | Pet safety (safe / toxic to pets) |
| **Environmental Impact** | Eco description |
| **Fun Fact** | Interesting fact about the plant |
| **Medicine Required** (conditional) | Shown only if `needs_medicine` is true — highlighted in red |

#### Bottom Actions
- **"اسأل الطبيب النباتي"** (Ask Plant Doctor) — opens the chat sheet
- **"امسح نباتًا آخر"** (Scan Another) — returns to camera
- **Plant Passport** — shows recent scans in a horizontal scroll row

### 6. Plant Doctor Chat

A **bottom sheet** (slides up from bottom) with a conversational AI interface:

- Greeting message introduces the doctor and the plant being discussed
- User types a question (Arabic text input, Enter to send)
- **Message flow:**
  1. User message is saved to localStorage/Supabase
  2. Full chat history + image URL + message is sent to the n8n chat webhook
  3. The n8n workflow returns a reply from the AI doctor
  4. Reply is saved and displayed
- **Error handling:** load errors, send errors, and persistence errors are shown as colored banners
- **Typing indicator:** animated dots while the doctor is "thinking"
- Chat history is **persistent** — reloading the app and opening the same scan's doctor shows previous messages

### 7. Plant Passport (Catalog)

Accessible from the camera screen (BookOpen button) or shown below the analysis result:

- **Two variants:**
  - `row` — horizontal scrollable strip (shown below analysis results)
  - `grid` — full grid layout (shown on the dedicated catalog page)

- Each **ScanCard** shows:
  - Plant image (lazy loaded)
  - Health status badge (color-coded)
  - Plant name
  - Scan date
  - Delete button (trash icon, with confirmation dialog)

- **Delete flow:** tapping delete opens a `ConfirmDeleteDialog` → confirms → deletes from Supabase (image + DB row + chat messages via cascade) or localStorage

- Clicking a scan card navigates to its analysis result screen

---

## Navigation System

The app uses a **custom stack-based navigation** (`useNavigation` hook) that mirrors browser history:

| Screen | Description |
|---|---|
| `camera` | Home — the camera view |
| `passport` | Full catalog grid |
| `result` | Analysis result for a specific scan (by ID) |

- **push** adds to stack and calls `window.history.pushState`
- **pop** removes from stack (triggered by browser back gesture or on-screen back buttons)
- **resetToCamera** replaces history with just the camera root
- The `popstate` event listener ensures the **native Android back gesture** works correctly
- Modal (chat sheet) is handled separately — closing it calls `history.forward()` to keep the stack aligned

---

## Data Model

### PlantAnalysis (Zod schema)

```typescript
{
  identification: {
    name: string,              // Common name (Arabic)
    scientific_name: string,   // Latin scientific name
    confidence: string,        // e.g. "85%"
  },
  health_assessment: {
    status: "صحي" | "إنذار" | "حرج",  // healthy | warning | critical
    diagnosis: string,
    needs_water: boolean,
    needs_medicine: boolean,
  },
  light_analysis: {
    current_light: string,
    recommendation: string,
  },
  care_instructions: {
    watering_frequency: string,
    soil_type: string,
    toxicity: "آمن للحيوانات الأليفة" | "سام للحيوانات الأليفة",
  },
  environmental_impact: string,
  fun_fact: string,
}
```

### ScanResult

```typescript
{
  id: string,          // UUID
  imageUrl: string,    // Supabase public URL or base64 data URL
  analysis: PlantAnalysis,
  temp?: number,       // Temperature (from n8n)
  humidity?: number,   // Humidity (from n8n)
  lat?: number,        // GPS latitude
  lng?: number,        // GPS longitude
  createdAt: string,   // ISO timestamp
}
```

### ChatMessage

```typescript
{
  id: string,
  scanId: string,      // Links to ScanResult
  role: "user" | "assistant",
  content: string,
  createdAt: string,
}
```

### Supabase Tables

| Table | Columns |
|---|---|
| `plants` | id, image_url, name, scientific_name, confidence, health_status, diagnosis, needs_water, needs_medicine, light_current, light_recommendation, care_watering, care_soil, toxicity, environmental_impact, fun_fact, analysis_json (full JSONB), temp, humidity, lat, lng, created_at |
| `chat_messages` | id, scan_id (FK → plants, CASCADE DELETE), role, content, created_at |

---

## Storage Strategy

| Scenario | Image Storage | Data Storage | Chat Storage |
|---|---|---|---|
| Supabase configured | Supabase Storage (`plant-photos` bucket) | Supabase Postgres (`plants` table) | Supabase Postgres (`chat_messages` table) |
| Supabase not configured | Base64 data URL in localStorage | localStorage (`phytoscan-scans`) | localStorage (`phytoscan-chat-{scanId}`) |

---

## PWA Features

### Service Worker (`public/sw.js`)

| Request Type | Strategy |
|---|---|
| `/_next/static/*` (hashed build assets) | CacheFirst (lazy-cached on first fetch) |
| `/_next/image/*` | CacheFirst (lazy-cached) |
| Navigations | NetworkFirst, fallback to `/offline.html` |
| Everything else (RSC, API calls) | NetworkOnly (never cached) |

### Web App Manifest

- **Name:** "PhytoScan - رفيق صحة نباتاتك"
- **Display:** standalone, portrait orientation
- **Icons:** 192x192, 512x512, maskable 512x512
- **Shortcuts:** "استئناف الفحص" (Resume Scan) → opens camera
- **Categories:** health, lifestyle, utilities

### Install Prompt

- **Chromium:** Captures `beforeinstallprompt` event, shows a polished install dialog (`InstallDialog` component)
- **iOS:** Shows a manual instruction banner ("Tap Share → Add to Home Screen")
- **Already installed:** Hidden (detects `display-mode: standalone`)

---

## UI Components

### Core Screens

| Component | Path | Purpose |
|---|---|---|
| `App` | `src/components/App.tsx` | Root client shell, orchestrates all screens |
| `CameraView` | `src/components/camera/CameraView.tsx` | Full-screen camera with capture, upload, catalog buttons |
| `WebcamWrapper` | `src/components/camera/WebcamWrapper.tsx` | SSR-safe react-webcam wrapper |
| `AnalysisResult` | `src/components/scan/AnalysisResult.tsx` | Plant analysis display with cards |
| `PlantPassport` | `src/components/passport/PlantPassport.tsx` | Scan catalog (row or grid variant) |
| `ScanCard` | `src/components/passport/ScanCard.tsx` | Individual scan card with image, badge, delete |
| `PlantDoctorChat` | `src/components/doctor/PlantDoctorChat.tsx` | AI chat bottom sheet |
| `Onboarding` | `src/components/onboarding/Onboarding.tsx` | 3-step first-launch tutorial |
| `LightMeter` | `src/components/light/LightMeter.tsx` | Animated luminance progress bar |
| `InstallPrompt` | `src/components/InstallPrompt.tsx` | PWA install prompts (Chromium + iOS) |
| `InstallDialog` | `src/components/InstallDialog.tsx` | Chromium install confirmation popup |
| `ThemeProvider` | `src/components/theme-provider.tsx` | Dark/Light theme context |

### UI Primitives (shadcn)

| Component | Path |
|---|---|
| `Button` | `src/components/ui/button.tsx` |
| `Badge` | `src/components/ui/badge.tsx` |
| `Card` | `src/components/ui/card.tsx` |
| `Sheet` | `src/components/ui/sheet.tsx` |
| `Textarea` | `src/components/ui/textarea.tsx` |
| `Skeleton` | `src/components/ui/skeleton.tsx` |
| `Separator` | `src/components/ui/separator.tsx` |
| `SuppressedImg` | `src/components/ui/suppressed-img.tsx` |
| `ConfirmDeleteDialog` | `src/components/ui/confirm-delete-dialog.tsx` |

---

## Hooks

| Hook | Path | Purpose |
|---|---|---|
| `useScanFlow` | `src/hooks/useScanFlow.ts` | Manages the full capture → compress → upload → analyze → save pipeline |
| `useNavigation` | `src/hooks/useNavigation.ts` | Stack-based screen navigation synced with browser history |
| `useOnboarding` | `src/hooks/useOnboarding.ts` | Tracks first-launch onboarding state (localStorage) |
| `useGeolocation` | `src/hooks/useGeolocation.ts` | Requests and holds GPS coordinates |

---

## Utility Libraries

| Module | Path | Purpose |
|---|---|---|
| `analysis` | `src/lib/analysis.ts` | n8n webhook calls, response coercion, Zod validation, status/toxicity string mapping |
| `compress` | `src/lib/compress.ts` | Client-side image compression (resize to 1280px, iterative JPEG quality reduction under 1MB) |
| `luminance` | `src/lib/luminance.ts` | Computes average brightness from a data URL (48x48 downscaled canvas) |
| `supabase` | `src/lib/supabase.ts` | Supabase client singleton, image upload/delete to Storage |
| `db` | `src/lib/db.ts` | Data access layer — save/get/delete scans and chat messages (Supabase or localStorage) |
| `config` | `src/lib/config.ts` | Environment variable reader |
| `types` | `src/lib/types.ts` | Zod schemas and TypeScript types |
| `styles` | `src/lib/styles.ts` | Health status color mappings (green/yellow/red badges) |
| `utils` | `src/lib/utils.ts` | `cn()` (classname merge), `dataUrlToBlob()`, `randomId()` (UUID v4) |

---

## Design System

Extracted from `DESIGN.md` and `globals.css`:

### Colors

| Token | Light | Dark |
|---|---|---|
| Background | `#ffffff` | `#020817` (slate-950) |
| Foreground | `#020817` | `#ffffff` |
| Primary | `#15803d` (green-700) | `#15803d` |
| Accent | `#059669` (emerald-600) | `#059669` |
| Muted | `#eef4ef` | `#0f1626` |
| Destructive | `#dc2626` | `#ef4444` |
| Border | `#dcfce7` (green-100) | `rgba(220,252,231,0.14)` |

### Typography

- **Display:** 36px, weight 700, line-height 1.11, letter-spacing -0.9px
- **Heading:** 30px, weight 700, line-height 1.2, letter-spacing -0.75px
- **Body:** 14px, weight 500, line-height 1.43
- **Font family:** IBM Plex Sans Arabic (body + heading), Geist Mono (code)

### Spacing & Radius

- Base unit: 8px, scale: [8, 16, 24, 32, 48, 64]
- Radius: sm 10px, md 12px, lg 16px, pill 9999px

### Shadows

- Card: subtle double-layer shadow
- Elevated: deeper multi-layer shadow

### Motion

- Fast: 150ms, Base: 1000ms, Slow: 2000ms
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`

---

## Security & Performance

### Security Headers (next.config.ts)

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| Service Worker CSP | `default-src 'self'; script-src 'self'` |

### Performance

- **React Compiler** enabled (`reactCompiler: true`) for automatic memoization
- **Image compression** keeps payloads under 1MB before upload
- **Lazy loading** on catalog card images
- **Service Worker** caches static assets for instant offline shell
- **Hydration safety** — all localStorage reads happen in `useEffect` to prevent SSR mismatches
- **Reduced motion** — LightMeter respects `useReducedMotion()` from motion library

---

## File Structure

```
plant-detector/
├── public/
│   ├── sw.js                    # Service worker
│   ├── offline.html             # Offline fallback page
│   ├── favicon.ico
│   ├── Mint-leaves.jpg          # Onboarding image 1
│   ├── analysis-green.png       # Onboarding image 2
│   └── chat-doctor.png          # Onboarding image 3
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout (RTL, fonts, theme, PWA)
│   │   ├── page.tsx             # Entry → <App />
│   │   ├── globals.css          # Tailwind v4 + theme tokens
│   │   ├── manifest.ts          # PWA manifest
│   │   ├── icon.tsx             # Dynamic icon generation
│   │   └── apple-icon.tsx       # Apple touch icon
│   ├── components/
│   │   ├── App.tsx              # Root client component
│   │   ├── InstallPrompt.tsx    # PWA install UI
│   │   ├── InstallDialog.tsx    # Chromium install dialog
│   │   ├── theme-provider.tsx   # Dark/Light context
│   │   ├── camera/
│   │   │   ├── CameraView.tsx   # Camera screen
│   │   │   └── WebcamWrapper.tsx # SSR-safe webcam
│   │   ├── scan/
│   │   │   └── AnalysisResult.tsx # Analysis display
│   │   ├── passport/
│   │   │   ├── PlantPassport.tsx  # Catalog component
│   │   │   └── ScanCard.tsx       # Scan card
│   │   ├── doctor/
│   │   │   └── PlantDoctorChat.tsx # AI chat sheet
│   │   ├── onboarding/
│   │   │   └── Onboarding.tsx     # First-launch tutorial
│   │   ├── light/
│   │   │   └── LightMeter.tsx     # Luminance meter
│   │   └── ui/                    # shadcn primitives
│   ├── hooks/
│   │   ├── useScanFlow.ts       # Scan pipeline
│   │   ├── useNavigation.ts     # Screen stack
│   │   ├── useOnboarding.ts     # Onboarding state
│   │   └── useGeolocation.ts    # GPS
│   └── lib/
│       ├── analysis.ts          # n8n API + validation
│       ├── compress.ts          # Image compression
│       ├── luminance.ts         # Brightness calculation
│       ├── supabase.ts          # Supabase client + storage
│       ├── db.ts                # Data access layer
│       ├── config.ts            # Env vars
│       ├── types.ts             # Zod schemas + types
│       ├── styles.ts            # Health badge colors
│       └── utils.ts             # cn, dataUrlToBlob, randomId
├── DESIGN.md                    # Design system tokens
├── AGENTS.md                    # Agent instructions
├── package.json                 # pnpm, Next.js 16, React 19
├── next.config.ts               # Security headers, React Compiler
├── tsconfig.json                # Strict TS, path aliases
├── .env.example                 # Required env vars template
└── postcss.config.mjs           # Tailwind v4 PostCSS
```
