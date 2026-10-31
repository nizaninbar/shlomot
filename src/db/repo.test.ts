import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  cloneWorkout,
  deleteEquipment,
  deleteLesson,
  deleteWorkout,
  DuplicateEquipmentError,
  listLessons,
  listLocations,
  OfflineError,
  refreshCache,
  saveEquipment,
  saveLesson,
  saveWorkout,
} from './repo'
import { fetchSnapshot, setTursoClient } from './turso'
import { fakeTurso } from './fakeTurso'

let fake: ReturnType<typeof fakeTurso>

beforeEach(async () => {
  await db.delete()
  await db.open()
  fake = fakeTurso()
  setTursoClient(fake.client)
})

const remote = () => fetchSnapshot(fake.client)

describe('writes go to Turso first, then the cache', () => {
  it('success updates both', async () => {
    const w = await saveWorkout({ name: 'א', description: '', equipmentIds: [] })
    expect(await db.workouts.get(w.id)).toEqual(w)
    expect((await remote()).workouts).toEqual([w])
  })

  it('failure throws OfflineError and leaves cache and Turso untouched', async () => {
    const w = await saveWorkout({ name: 'א', description: '', equipmentIds: [] })
    fake.state.failing = true
    await expect(saveWorkout({ ...w, name: 'ב' })).rejects.toBeInstanceOf(OfflineError)
    await expect(saveWorkout({ name: 'חדש', description: '', equipmentIds: [] })).rejects.toBeInstanceOf(OfflineError)
    await expect(saveLesson({ workoutId: w.id, date: '2026-01-01', time: '10:00', location: '' })).rejects.toBeInstanceOf(OfflineError)
    await expect(saveEquipment({ name: 'כדור' })).rejects.toBeInstanceOf(OfflineError)
    await expect(deleteWorkout(w.id)).rejects.toBeInstanceOf(OfflineError)
    expect(await db.workouts.toArray()).toEqual([w])
    expect(await db.lessons.count()).toBe(0)
    expect(await db.equipment.count()).toBe(0)
    fake.state.failing = false
    expect((await remote()).workouts).toEqual([w])
  })

  it('not configured counts as offline', async () => {
    setTursoClient(null)
    await expect(saveEquipment({ name: 'כדור' })).rejects.toBeInstanceOf(OfflineError)
    expect(await db.equipment.count()).toBe(0)
  })

  it('save keeps createdAt on edit', async () => {
    const w = await saveWorkout({ name: 'a', description: '', equipmentIds: [] })
    const edited = await saveWorkout({ ...w, name: 'b' })
    expect(edited.createdAt).toBe(w.createdAt)
    expect((await remote()).workouts[0]).toMatchObject({ name: 'b', createdAt: w.createdAt })
  })
})

describe('equipment', () => {
  it('saves an icon, keeps it on rename, and clears it with an empty string', async () => {
    const a = await saveEquipment({ name: 'כדור', icon: 'ball' })
    expect(a.icon).toBe('ball')
    const renamed = await saveEquipment({ id: a.id, name: 'כדור גדול' })
    expect(renamed.icon).toBe('ball')
    expect((await remote()).equipment[0]).toMatchObject({ name: 'כדור גדול', icon: 'ball' })
    expect((await db.equipment.get(a.id))!.icon).toBe('ball')
    const cleared = await saveEquipment({ id: a.id, name: 'כדור גדול', icon: '' })
    expect(cleared.icon).toBeUndefined()
    expect((await remote()).equipment[0].icon).toBeUndefined()
  })

  it('rejects duplicate names case-insensitively, allows renaming itself', async () => {
    const a = await saveEquipment({ name: 'Ball' })
    await expect(saveEquipment({ name: ' ball ' })).rejects.toBeInstanceOf(DuplicateEquipmentError)
    expect(await db.equipment.count()).toBe(1)
    await expect(saveEquipment({ id: a.id, name: 'BALL' })).resolves.toMatchObject({ name: 'BALL' })
    expect((await remote()).equipment.map((e) => e.name)).toEqual(['BALL'])
  })

  it('delete removes the id from all workouts in one batch, in Turso and in the cache', async () => {
    const a = await saveEquipment({ name: 'א' })
    const b = await saveEquipment({ name: 'ב' })
    const w = await saveWorkout({ name: 'w', description: '', equipmentIds: [a.id, b.id] })
    const before = fake.state.batches
    await deleteEquipment(a.id)
    expect(fake.state.batches - before).toBe(1)
    expect(await db.equipment.get(a.id)).toBeUndefined()
    expect((await db.workouts.get(w.id))!.equipmentIds).toEqual([b.id])
    const snap = await remote()
    expect(snap.equipment.map((e) => e.id)).toEqual([b.id])
    expect(snap.workouts[0].equipmentIds).toEqual([b.id])
  })
})

describe('workouts', () => {
  it('delete cascades to lessons in one batch', async () => {
    const w1 = await saveWorkout({ name: '1', description: '', equipmentIds: [] })
    const w2 = await saveWorkout({ name: '2', description: '', equipmentIds: [] })
    await saveLesson({ workoutId: w1.id, date: '2026-01-01', time: '10:00', location: 'x' })
    await saveLesson({ workoutId: w2.id, date: '2026-01-02', time: '10:00', location: 'y' })
    const before = fake.state.batches
    await deleteWorkout(w1.id)
    expect(fake.state.batches - before).toBe(1)
    expect(await db.workouts.get(w1.id)).toBeUndefined()
    expect(await listLessons(w1.id)).toHaveLength(0)
    expect(await listLessons(w2.id)).toHaveLength(1)
    const snap = await remote()
    expect(snap.workouts.map((w) => w.id)).toEqual([w2.id])
    expect(snap.lessons.map((l) => l.workoutId)).toEqual([w2.id])
  })

  it('clone returns an unsaved draft based on the source', async () => {
    const w = await saveWorkout({ name: 'בסיס', description: 'תיאור', equipmentIds: ['e1'] })
    const draft = await cloneWorkout(w.id)
    expect(draft).toEqual({ name: 'בסיס – עותק', description: 'תיאור', equipmentIds: ['e1'], basedOnId: w.id })
    expect(await db.workouts.count()).toBe(1)
    expect((await remote()).workouts).toHaveLength(1)
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

  it('delete removes from Turso and the cache', async () => {
    const w = await saveWorkout({ name: 'w', description: '', equipmentIds: [] })
    const l = await saveLesson({ workoutId: w.id, date: '2026-01-01', time: '10:00', location: '' })
    await deleteLesson(l.id)
    expect(await db.lessons.count()).toBe(0)
    expect((await remote()).lessons).toEqual([])
  })
})

describe('refreshCache', () => {
  it('replaces the cache with the Turso snapshot, dropping local-only rows', async () => {
    const w = await saveWorkout({ name: 'in turso', description: '', equipmentIds: [] })
    await db.workouts.put({ id: 'stale', name: 'local only', description: '', equipmentIds: [], createdAt: 1, updatedAt: 1 })
    await db.workouts.delete(w.id)
    await refreshCache()
    expect((await db.workouts.toArray()).map((x) => x.id)).toEqual([w.id])
  })

  it('failure leaves the cache as it was', async () => {
    const w = await saveWorkout({ name: 'a', description: '', equipmentIds: [] })
    fake.state.failing = true
    await expect(refreshCache()).rejects.toBeInstanceOf(OfflineError)
    expect(await db.workouts.toArray()).toEqual([w])
  })
})
