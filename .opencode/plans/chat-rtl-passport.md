# Plan: Chat UX, RTL layout, responsive audit, Passport button

## Goals
1. Make the app fully mobile responsive.
2. Fix chat UX: message list does not scroll and the close button is unreachable.
3. RTL chat layout: my (user) messages on the **right**, AI responses on the **left**.
4. Add a "Passport" button to the first (camera) screen so past scans are reachable without taking a picture. Opens as a **full-screen passport screen**.

## Design tokens (DESIGN.md / globals.css)
- Accent green `#15803d`; background `#020817`; border `#dcfce7`.
- Radius: `rounded-2xl` bubbles, `rounded-full` controls.
- Breakpoints: 640/768/1024 with Tailwind `sm:/md:/lg:`.
- Doc is `dir="rtl"` (see `src/app/layout.tsx`), fonts IBM Plex Arabic, all UI text already Arabic.
- RTL note: `self-start` aligns to **right**, `self-end` aligns to **left**.

## Changes

### 1. Chat scroll + close button fix — `src/components/doctor/PlantDoctorChat.tsx`
Root cause: bottom `SheetContent` is `h-[85dvh]` + `flex flex-col`. The messages container `flex-1 ... overflow-y-auto` lacks `min-h-0`, so it grows to full content height and overflows past the fixed sheet, pushing header/footer off and making the sheet unscrollable (close button unreachable).
- Add `min-h-0` to the messages scroll container:
  `className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"`
- Cap sheet width on desktop (avoids edge-to-edge bottom sheet):
  `SheetContent side="bottom" className="mx-auto h-[85dvh] w-full max-w-2xl"`

### 2. RTL chat alignment — `src/components/doctor/PlantDoctorChat.tsx`
Currently user=`self-end` (left) and assistant=`self-start` (right) — swapped vs. what we want.
- User bubble → `self-start` (right), notch `rounded-br-sm`.
- Assistant bubble → `self-end` (left), notch `rounded-bl-sm`.
- Send icon: confirm arrow direction for RTL chain (`Send` icon); adjust `-scale-x-100` if needed so it points left toward the right-aligned send.

### 3. Passport button on camera screen — `src/components/camera/CameraView.tsx`
- Replace the empty spacer `<div className="h-14 w-14" aria-hidden />` with a real button styled like the others (`h-14 w-14 rounded-full bg-white/10 text-white`), icon e.g. `BookOpen`/`Files`, `aria-label="عرض جواز سفر النبات"`.
- Add prop `onOpenPassport?: () => void`; wire `onClick={onOpenPassport}`.

### 4. Full-screen passport screen — `src/components/App.tsx` + `src/components/passport/PlantPassport.tsx`
- `App.tsx`: extend `Step` type with `"passport"`. Add handler to open the passport screen. Render a new full-screen step:
  - Header: title "جواز سفر النبات", back button (returns to camera), theme toggle.
  - Responsive grid of past scans (reuse `PlantPassport`).
  - Empty state with a button back to camera.
  - Tapping a scan runs existing `selectScan` → its result screen.
- `PlantPassport.tsx`: add a `variant` prop (`"row"` default | `"grid"`) so the result screen keeps the compact horizontal snap-scroll row and the passport screen renders a responsive grid (`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4`).

### 5. Responsive audit
- Camera: keep the crop frame within small-phone and wide screens (`w-[min(78%,18rem)]`); keep the three-control bar balanced.
- Result: already `max-w-2xl mx-auto px-4 py-6`; `AnalysisResult` grid stacks `col-span-2 sm:col-span-1` — confirm.
- Passport: new grid columns responsive.
- Chat: bottom sheet `h-[85dvh]` + `max-w-2xl` cap.

## Verification
- `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`.
- Runtime (browser devtools): camera→passport button opens full-screen passport; tap scan opens result; chat sends several messages → list scrolls internally, input bar pinned, close button reachable; user bubbles right / AI left in RTL.

## Files touched
- `src/components/doctor/PlantDoctorChat.tsx`
- `src/components/camera/CameraView.tsx`
- `src/components/App.tsx`
- `src/components/passport/PlantPassport.tsx`
