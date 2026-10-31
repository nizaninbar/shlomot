import { describe, expect, it } from 'vitest'
import { buildMonthGrid, capIcons, groupLessonsByDay, monthRange } from './calendar'
import type { Lesson, Workout } from '../db/types'

describe('buildMonthGrid', () => {
  it('starts on Sunday and pads full weeks', () => {
    // Oct 2026 starts on Thursday, 31 days -> 5 weeks
    const g = buildMonthGrid(2026, 9)
    expect(g).toHaveLength(5)
    expect(g.every((w) => w.length === 7)).toBe(true)
    expect(g[0][0]).toEqual({ date: '2026-09-27', day: 27, inMonth: false })
    expect(g[0][4]).toEqual({ date: '2026-10-01', day: 1, inMonth: true })
    expect(g[4][6].date).toBe('2026-10-31')
  })
  it('handles leap February', () => {
    expect(monthRange(2028, 1)).toEqual({ start: '2028-02-01', end: '2028-02-29' })
    expect(monthRange(2027, 1).end).toBe('2027-02-28')
    const days = buildMonthGrid(2028, 1).flat().filter((c) => c.inMonth)
    expect(days).toHaveLength(29)
  })
  it('crosses year boundaries', () => {
    const g = buildMonthGrid(2026, 11)
    expect(g.flat().some((c) => c.date === '2027-01-01' && !c.inMonth)).toBe(true)
    expect(buildMonthGrid(2027, 0)[0].some((c) => c.date === '2026-12-31')).toBe(true)
  })
  it('exact 4-week month has no padding (Feb 2026)', () => {
    const g = buildMonthGrid(2026, 1)
    expect(g).toHaveLength(4)
    expect(g.flat().every((c) => c.inMonth)).toBe(true)
  })
})

const w = (id: string, equipmentIds: string[]): Workout => ({
  id, name: id, description: '', equipmentIds, createdAt: 0, updatedAt: 0,
})
const l = (id: string, workoutId: string, date: string, time: string): Lesson => ({
  id, workoutId, date, time, location: '', updatedAt: 0,
})

describe('groupLessonsByDay', () => {
  it('groups, sorts by time and dedupes equipment', () => {
    const g = groupLessonsByDay(
      [l('b', 'w2', '2026-10-05', '18:00'), l('a', 'w1', '2026-10-05', '09:00'), l('c', 'w1', '2026-10-06', '09:00')],
      [w('w1', ['x', 'y']), w('w2', ['y', 'z'])],
    )
    expect(g['2026-10-05'].lessons.map((d) => d.lesson.id)).toEqual(['a', 'b'])
    expect(g['2026-10-05'].equipmentIds).toEqual(['x', 'y', 'z'])
    expect(g['2026-10-06'].lessons).toHaveLength(1)
  })
  it('tolerates a missing workout', () => {
    const g = groupLessonsByDay([l('a', 'gone', '2026-10-05', '09:00')], [])
    expect(g['2026-10-05'].lessons[0].workout).toBeUndefined()
    expect(g['2026-10-05'].equipmentIds).toEqual([])
  })
})

describe('capIcons', () => {
  it('caps at 3 with a +N remainder', () => {
    expect(capIcons(['a', 'b', 'c', 'd', 'e'])).toEqual({ shown: ['a', 'b', 'c'], extra: 2 })
    expect(capIcons(['a'])).toEqual({ shown: ['a'], extra: 0 })
  })
})
