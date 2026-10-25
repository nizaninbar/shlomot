import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  cloneWorkout,
  exportAll,
  importAll,
  InvalidBackupError,
  parseBackup,
  deleteEquipment,
  deleteWorkout,
  DuplicateEquipmentError,
  listLessons,
  listLocations,
  saveEquipment,
  saveLesson,
  saveWorkout,
} from './repo'
import { seedIfEmpty } from './seed'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('equipment', () => {
  it('rejects duplicate names case-insensitively, allows renaming itself', async () => {
    const a = await saveEquipment({ name: 'Ball' })
    await expect(saveEquipment({ name: ' ball ' })).rejects.toBeInstanceOf(DuplicateEquipmentError)
    await expect(saveEquipment({ id: a.id, name: 'BALL' })).resolves.toMatchObject({ name: 'BALL' })
  })

  it('delete removes the id from all workouts', async () => {
    const a = await saveEquipment({ name: 'א' })
    const b = await saveEquipment({ name: 'ב' })
    const w = await saveWorkout({ name: 'w', description: '', equipmentIds: [a.id, b.id] })
    await deleteEquipment(a.id)
    expect(await db.equipment.get(a.id)).toBeUndefined()
    expect((await db.workouts.get(w.id))!.equipmentIds).toEqual([b.id])
  })

  it('seeds once', async () => {
    await seedIfEmpty()
    await seedIfEmpty()
    expect(await db.equipment.count()).toBe(8)
  })
})

describe('workouts', () => {
  it('delete cascades to lessons', async () => {
    const w1 = await saveWorkout({ name: '1', description: '', equipmentIds: [] })
    const w2 = await saveWorkout({ name: '2', description: '', equipmentIds: [] })
    await saveLesson({ workoutId: w1.id, date: '2026-01-01', time: '10:00', location: 'x' })
    await saveLesson({ workoutId: w2.id, date: '2026-01-02', time: '10:00', location: 'y' })
    await deleteWorkout(w1.id)
    expect(await db.workouts.get(w1.id)).toBeUndefined()
    expect(await listLessons(w1.id)).toHaveLength(0)
    expect(await listLessons(w2.id)).toHaveLength(1)
  })

  it('clone returns an unsaved draft based on the source', async () => {
    const w = await saveWorkout({ name: 'בסיס', description: 'תיאור', equipmentIds: ['e1'] })
    const draft = await cloneWorkout(w.id)
    expect(draft).toEqual({ name: 'בסיס – עותק', description: 'תיאור', equipmentIds: ['e1'], basedOnId: w.id })
    expect(await db.workouts.count()).toBe(1)
  })

  it('save keeps createdAt on edit', async () => {
    const w = await saveWorkout({ name: 'a', description: '', equipmentIds: [] })
    const edited = await saveWorkout({ ...w, name: 'b' })
    expect(edited.createdAt).toBe(w.createdAt)
    expect(edited.updatedAt).toBeGreaterThanOrEqual(w.updatedAt)
  })
})

describe('lessons', () => {
  it('lists newest first and distinct non-empty locations', async () => {
    const w = await saveWorkout({ name: 'w', description: '', equipmentIds: [] })
    await saveLesson({ workoutId: w.id, date: '2026-01-01', time: '10:00', location: 'סטודיו' })
    await saveLesson({ workoutId: w.id, date: '2026-02-01', time: '09:00', location: 'סטודיו' })
    await saveLesson({ workoutId: w.id, date: '2026-02-01', time: '18:00', location: '' })
    expect((await listLessons(w.id)).map((l) => l.time)).toEqual(['18:00', '09:00', '10:00'])
    expect(await listLocations()).toEqual(['סטודיו'])
  })
})

describe('backup', () => {
  it('export -> import round-trips and replaces existing data', async () => {
    const eq = await saveEquipment({ name: 'כדור' })
    const w = await saveWorkout({ name: 'א', description: 'ד', equipmentIds: [eq.id] })
    await saveLesson({ workoutId: w.id, date: '2026-01-01', time: '10:00', location: 'סטודיו' })
    const backup = parseBackup(JSON.parse(JSON.stringify(await exportAll())))
    await saveWorkout({ name: 'זמני', description: '', equipmentIds: [] })
    await importAll(backup)
    expect(await db.workouts.toArray()).toEqual([w])
    expect(await db.lessons.count()).toBe(1)
    expect(await db.equipment.count()).toBe(1)
  })

  it('rejects malformed files', () => {
    expect(() => parseBackup({})).toThrow(InvalidBackupError)
    expect(() => parseBackup({ app: 'shlomot', version: 1, equipment: [], workouts: [{ id: 1 }], lessons: [] })).toThrow(
      InvalidBackupError,
    )
  })

  it('reminder is due only after 14 days', async () => {
    const { backupDue } = await import('../lib/backupMeta')
    const day = 86_400_000
    expect(backupDue(null, null, 100 * day)).toBe(false)
    expect(backupDue(90 * day, 1, 100 * day)).toBe(false)
    expect(backupDue(80 * day, 1, 100 * day)).toBe(true)
    expect(backupDue(null, 80 * day, 100 * day)).toBe(true)
  })
})
