# shlomot (שלומות)

Mobile-first Hebrew RTL PWA for one Pilates instructor to plan classes from past ones. Phone only, MVP, free hosting.
Build progress and next stage: see `docs/STAGES.md`. Do one stage per session, then stop for review.

## Stack
- Vite + React + TypeScript. `index.html` is `lang="he" dir="rtl"`.
- HashRouter (GitHub Pages). Vite `base: '/shlomot/'`. Use `import.meta.env.BASE_URL` for public asset paths.
- Storage: Dexie (IndexedDB) + `dexie-react-hooks` (`useLiveQuery`). Supabase sync is a later optional stage.
- All DB access goes through `src/db/repo.ts` (UI never touches Dexie tables directly).
- Deploy: `.github/workflows/deploy.yml` on push to `main`.
- Plain CSS with custom properties, no UI library. Use logical properties (`margin-inline-start`, `padding-inline`).

## Commands
- `npm run dev -- --host`: dev server reachable from the phone over LAN.
- `npm run build`: type-check + build.
- `npx vitest run`: tests (from stage 1).
- `npm run icons`: regenerate `public/icons/*` from `public/shlomot.png`. Never load the 640KB original at runtime.

## Data model (`src/db/types.ts`)
```ts
Equipment { id: string; name: string; updatedAt: number }   // name unique, case-insensitive check in repo
Workout   { id; name; description; equipmentIds: string[]; basedOnId?: string; createdAt: number; updatedAt: number }
Lesson    { id; workoutId: string; date: string /*YYYY-MM-DD*/; time: string /*HH:mm*/; location: string; updatedAt: number }
```
- IDs: `crypto.randomUUID()`. Every write sets `updatedAt` (needed for future sync).
- Dexie db `shlomot` v1: `equipment: 'id, &name'`, `workouts: 'id, name, createdAt, *equipmentIds, basedOnId'`, `lessons: 'id, workoutId, date, location'`.
- A workout's lessons are queried by `workoutId`, never stored inside the workout.

## Rules
- Equipment filter chips: several selected = AND (workout must contain ALL).
- Search matches name + description, case-insensitive, trimmed.
- Clone ("צור אימון חדש על בסיס זה"): name + " – עותק", same description and equipment, `basedOnId` = source. Opens the form; saves only on submit; then offers to add a lesson.
- Delete workout → confirm, also delete its lessons. Missing `basedOnId` target → show "מבוסס על אימון שנמחק".
- Delete equipment → confirm, remove its id from all workouts in one transaction.

## UI conventions
- All UI text in Hebrew, kept in `src/strings.ts`.
- Touch targets ≥ 48px (`--touch`), inputs ≥ 16px font, 16px side gutter, no horizontal scroll at 360px.
- Tokens in `src/styles/theme.css`: cream background, card, turquoise (deep variant for text/buttons), pink accent, thin gold 1px lines, font Assistant.
- Feel: calm, warm, feminine wellness studio. Faint gold mandala watermark (`src/components/Mandala.tsx`).
