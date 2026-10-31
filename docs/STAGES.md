# Stages (open only)

Start each session with: "Read CLAUDE.md and docs/STAGES.md, then do stage N."
Each stage ends with `npm run build` and `npx vitest run` passing, then stop for review. When done, tick the box and add 2-3 lines of notes. Completed stages 0-8 live in `docs/20261031/STAGES.md` (archive, don't read).

- [x] **Stage 9: Equipment icons** (done; build + 25 tests pass, visual check at 360px / largest text still pending review)
  Notes:
  - `Equipment.icon?: string` (key into a built-in set of ~24 inline-SVG icons in `src/components/icons/equipmentIcons.tsx`; `EquipmentIcon` component with fallback dot). No Dexie schema bump.
  - Turso: nullable `icon TEXT` on `equipment`; guarded migration in `ensureSchema` (`PRAGMA table_info`, then `ALTER TABLE ... ADD COLUMN` only if missing). Update `fromEquipment`, `upsertEquipment`, `fetchSnapshot`.
  - `saveEquipment({id?, name, icon?})`; rename keeps the existing icon.
  - UI: grid picker on `src/pages/Equipment.tsx` (>=48px targets, includes "no icon"); show icons in `EquipmentChips` and workout tags. Strings in `src/strings.ts`, CSS in `global.css` (rem, logical props).
  - Tests: icon save/keep-on-rename, snapshot round-trip, `ensureSchema` upgrade of old table.
  - Review: check picker at 360px / largest text; icon persists after clearing the cache.
  - Done: 23 icons in `equipmentIcons.tsx`, `IconPicker` (auto-fill grid, 48px). `saveEquipment` icon: omitted = keep, `''` = clear. Equipment list's "שינוי שם" button is now "עריכה" (edits name + icon).

- [ ] **Stage 10: Calendar page** (needs stage 9)
  Notes:
  - `listLessonsInRange(start, end)` in `repo.ts` (uses the `date` index). Pure helpers in `src/lib/calendar.ts`: `buildMonthGrid`, `groupLessonsByDay` (lesson -> workout -> deduped equipment ids).
  - `src/pages/Calendar.tsx`, route `/calendar`, header link "לוח שנה". Month grid (week starts Sunday, RTL), prev/next/today; each day shows up to 3 equipment icons then `+N`; tapping a day lists its lessons (time, workout, location, icons); tapping a lesson opens `/workout/:id`.
  - Tests: `calendar.test.ts` (month boundaries, leap Feb, grouping, icon dedupe/cap).
  - Review: grid and header fit at 360px / largest text; deleting a lesson updates the grid.
