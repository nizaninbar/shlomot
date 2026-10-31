import type { Lesson, Workout } from '../db/types'

export type DayCell = { date: string; day: number; inMonth: boolean }

export const MAX_DAY_ICONS = 3

const pad = (n: number) => String(n).padStart(2, '0')
export const toIso = (y: number, m0: number, d: number) => `${y}-${pad(m0 + 1)}-${pad(d)}`

/** First and last ISO date of a month (month0 = 0..11). */
export function monthRange(year: number, month0: number): { start: string; end: string } {
  const last = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate()
  return { start: toIso(year, month0, 1), end: toIso(year, month0, last) }
}

/** Weeks (Sunday first) covering the month; days outside the month are padding. */
export function buildMonthGrid(year: number, month0: number): DayCell[][] {
  const offset = new Date(Date.UTC(year, month0, 1)).getUTCDay() // 0 = Sunday
  const length = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate()
  const total = Math.ceil((offset + length) / 7) * 7
  const weeks: DayCell[][] = []
  for (let i = 0; i < total; i++) {
    const d = new Date(Date.UTC(year, month0, 1 - offset + i))
    const cell: DayCell = {
      date: toIso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === month0 && d.getUTCFullYear() === year,
    }
    if (i % 7 === 0) weeks.push([])
    weeks[weeks.length - 1].push(cell)
  }
  return weeks
}

export type DayLesson = { lesson: Lesson; workout?: Workout }
export type DayInfo = { lessons: DayLesson[]; equipmentIds: string[] }

/** Group lessons by date (sorted by time); equipmentIds = deduped ids of the day's workouts. */
export function groupLessonsByDay(lessons: Lesson[], workouts: Workout[]): Record<string, DayInfo> {
  const byId = new Map(workouts.map((w) => [w.id, w]))
  const result: Record<string, DayInfo> = {}
  for (const lesson of lessons) {
    const info = (result[lesson.date] ??= { lessons: [], equipmentIds: [] })
    const workout = byId.get(lesson.workoutId)
    info.lessons.push({ lesson, workout })
  }
  for (const info of Object.values(result)) {
    info.lessons.sort((a, b) => a.lesson.time.localeCompare(b.lesson.time))
    info.equipmentIds = [...new Set(info.lessons.flatMap((d) => d.workout?.equipmentIds ?? []))]
  }
  return result
}

/** Icons shown in a day cell, plus how many more are hidden. */
export function capIcons<T>(ids: T[], max = MAX_DAY_ICONS): { shown: T[]; extra: number } {
  return { shown: ids.slice(0, max), extra: Math.max(0, ids.length - max) }
}
