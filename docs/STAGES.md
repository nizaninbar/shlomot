# Stages

Start each session with: "Read CLAUDE.md and docs/STAGES.md, then do stage N."
Each stage ends with `npm run build` passing (and tests from stage 1), then stops for review.
When a stage is done: tick it and add 2–3 lines of notes.

- [x] **Stage 0: Scaffold, theme, deploy**
  Vite/React/TS by hand, HashRouter, Header with logo, theme tokens, mandala watermark, empty Home, icons in `public/icons/`, GitHub Pages workflow.
  Notes: React 19, Vite 8, TypeScript 7. `sharp` is a dev dependency only for `npm run icons`.

- [x] **Stage 1: Data layer + equipment**
  Notes: Dexie v1 schema per CLAUDE.md; `repo.ts` exports `WorkoutDraft` and `DuplicateEquipmentError`. `seedIfEmpty()` runs in `main.tsx`. Equipment page uses `window.confirm` for delete; 7 vitest tests pass. Still to verify on the phone: persistence across reload.
  - Install `dexie`, `dexie-react-hooks`, `vitest`, `fake-indexeddb` (tests).
  - `src/db/types.ts`, `db.ts`, `repo.ts`: listWorkouts, getWorkout, saveWorkout, deleteWorkout (cascade lessons), cloneWorkout (returns an unsaved draft), listLessons(workoutId), saveLesson, deleteLesson, listEquipment, saveEquipment (unique name), deleteEquipment (cascade), listLocations (distinct).
  - `seed.ts`: first run adds מזרן, רפורמר, כדור, טבעת פילאטיס, גומייה, גליל, משקולות, כדור קטן.
  - Equipment page (`/equipment`): list, add, rename, delete with confirm. Link from the header.
  - Vitest: unique name, equipment delete cascade, workout delete cascade, clone.
  - Review: manage equipment on the phone; survives reload.

- [x] **Stage 2: Workouts (home, search, filter, form, detail)**
  Notes: routes `/workout/new`, `/workout/:id`, `/workout/:id/edit`. `filterWorkouts` in `src/lib/` (5 tests); `repo.lastLessonDates()` feeds the last-taught line. Delete uses `window.confirm`. Still to verify on the phone: create/edit/search/filter, chip row scroll at 360px.
  - Home: search box, horizontal equipment chips (AND), workout cards (name, a short line of description, equipment tags, last-taught date), FAB "אימון חדש", empty states.
  - Pure `filterWorkouts(workouts, query, selectedIds)` + unit tests.
  - WorkoutForm (create/edit): name required, description textarea, equipment multi-select chips.
  - WorkoutDetail: description keeps line breaks, equipment, edit, delete.
  - Review: create, edit, search and filter.

- [x] **Stage 3: Lessons + "based on" flow**
  Notes: routes `/workout/:id/clone`, `/workout/:id/lesson/new`, `/lesson/:lessonId/edit`. Clone reuses `WorkoutForm` (`clone` prop) and asks `window.confirm` to add a lesson after saving. Added `repo.listBasedOn` and `getLesson`. Still to verify on the phone: full flow, date/time inputs in RTL.
  - Detail: lessons list (newest first), "הוסף שיעור".
  - LessonForm: date (default today), time, location (datalist of past locations); edit/delete.
  - Clone flow (see CLAUDE.md Rules), then "להוסיף שיעור עכשיו?".
  - Detail shows "מבוסס על: X" link and "אימונים שמבוססים על זה".
  - Review: the full flow on the phone.

- [x] **Stage 4: PWA, offline, backup**
  Notes: `vite-plugin-pwa` (generateSW, Google Fonts runtime-cached); `/settings` page with export/import (`repo.exportAll/parseBackup/importAll`, 3 new tests); last-backup date in localStorage (`src/lib/backupMeta.ts`), reminder on Home after 14 days (counted from the oldest workout if never backed up). Still to verify on the phone: install, offline, export → clear → import.
  - `vite-plugin-pwa`: name שלומות, `dir: rtl`, `lang: he`, cream background, turquoise theme, icons from `public/icons/`, autoUpdate, scope/start_url `/shlomot/`.
  - `navigator.storage.persist()` on startup.
  - Settings page: export JSON (Web Share API, download fallback), import JSON (validate, confirm, replace all), last-backup date; gentle home reminder after 14 days with no backup.
  - Review: install to home screen, use offline, export → clear → import.

- [x] **Stage 5 (optional): Turso sync**
  Notes: setup in `docs/TURSO.md`. Switched from Supabase (free tier full, pauses after 7 idle days). The user pastes the Turso URL + token into the Settings sync card; they live in localStorage only (no secrets in the bundle or repo). `src/db/turso.ts` creates the tables itself and implements `Remote` over `@libsql/client/web`. Dexie v2 adds a local `tombstones` table written by every delete; `sync.ts` pulls then pushes (tested with a fake remote, 5 tests); `autosync.ts` syncs on start, online, app-visible and 4s after edits. Verified working end to end with a real Turso DB.
  - Tables mirror types + `deleted_at` tombstones; upserts are last-write-wins by `updated_at`.
  - `src/db/sync.ts`: push local changes, pull `updatedAt > lastPull`. App stays fully usable offline.

## Turso as the single source of truth (stages 6–8)

Why: every device holds a full writable Dexie copy that is reconciled by two-way last-write-wins sync, which causes inconsistencies (stale edits, resurrected deletes, merged duplicates). Turso becomes the only writable store; Dexie becomes a disposable read-only cache for offline browsing.

Decisions:
- Writes go to Turso first (one `client.batch` for cascades), then write through to the cache. Offline or failed write = error shown, nothing saved locally.
- `refreshCache()` replaces the cache with a full Turso snapshot (on start, online, app visible, after writes). No `updatedAt` comparison, no tombstones, no merge.
- Real `DELETE`s. Equipment name uniqueness enforced by a Turso unique index on `lower(name)` → `DuplicateEquipmentError`.
- Unconfigured device (no URL/token) shows a blocking setup screen. No local-only mode.
- Default-equipment seeding and JSON backup/import/export are removed.
- No data migration: Turso is confirmed up to date; local copies are discarded.

- [x] **Stage 6: Turso-first data layer**
  Notes: writes go through `commit()` in `repo.ts` (one `client.batch`, then cache write-through); failures throw `OfflineError`, a unique-index hit throws `DuplicateEquipmentError`. `refreshCache()` replaces the cache and retries if a write landed meanwhile. `ensureSchema` also deletes old tombstoned rows and creates the `lower(name)` unique index; `getTursoClient()` is the shared client (`setTursoClient` injects the fake from `fakeTurso.ts`, a real in-memory libSQL). Equipment delete strips the id from workouts in SQL (`json_each`). `sync.ts` is now just the two leftover helpers and `autosync.ts` just calls `refreshCache` (both replaced in 7/8); backup/seed still present until stage 8. 25 tests pass, build passes.
  - `turso.ts`: query/execute helpers, unique index on `lower(name)`, hard deletes (`deleted_at` column left unused).
  - `repo.ts`: rewrite `saveWorkout`, `deleteWorkout`, `saveLesson`, `deleteLesson`, `saveEquipment`, `deleteEquipment` as Turso write → cache write-through; list/get/clone stay cache reads. Add `refreshCache()` and `OfflineError`.
  - Tests with a fake Turso client (replace `sync.test.ts`, adapt `repo.test.ts`, `turso.test.ts`): success updates cache, failure leaves it untouched, cascades are one batch, duplicate name, refresh replaces the cache.

- [x] **Stage 7: UI for connection and failures**
  Notes: `src/db/cache.ts` replaces `autosync.ts` (status store, `refresh`, `connect`, `disconnect` which also empties the cache, `startCache`). `App` shows `SetupScreen` (`ConnectForm`) until configured; `ConnectionBadge` in the header (dot only when ok, label when offline/error); `SyncSection` is now the connected-database card in Settings. Forms/Equipment show `connection.saveOffline` on `OfflineError`, keep their input, and disable buttons while writing. Phone checks still to do (A→B, airplane mode, clear site data). 25 tests pass, build passes.
  - Setup-required screen when unconfigured (reuse `SyncSection` fields); header connection indicator (online / offline read-only / error).
  - Hebrew strings in `src/strings.ts` (e.g. "אין חיבור, לא ניתן לשמור"); forms keep their input on failure; save disabled while writing.
  - Replace `autosync.ts` with `cache.ts` (refresh on start/online/visible); drop "sync" wording.
  - Review on the phone: edit on A shows on B; airplane mode browses but save errors; clear site data repopulates.

- [ ] **Stage 8: Remove the old machinery**
  - Delete `sync.ts`, `applyRemote`, `listChangedSince`, tombstones (`db.version(3)` with `tombstones: null`), `seed.ts` and its call in `main.tsx`, `exportAll/parseBackup/importAll`, `backupMeta.ts`, the Settings backup card, the Home backup reminder, `navigator.storage.persist()`.
  - Update `CLAUDE.md` (Dexie = read cache, Turso = truth, no tombstones) and `docs/TURSO.md`.
