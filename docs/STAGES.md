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
