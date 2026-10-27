import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { deleteEquipment, deleteWorkout, saveEquipment, saveLesson, saveWorkout, type SyncBatch } from './repo'
import { resetSyncState, syncNow, type Remote } from './sync'

type Stored = { updatedAt: number; deletedAt?: number; row: unknown }
const store = new Map<string, Map<string, Stored>>()

/** In-memory stand-in for the backend: keeps the latest row per id, like an upsert. */
function fakeRemote(): Remote {
  return {
    async pull(since) {
      const out: SyncBatch = { equipment: [], workouts: [], lessons: [], tombstones: [] }
      for (const table of ['equipment', 'workouts', 'lessons'] as const) {
        for (const [id, r] of store.get(table) ?? []) {
          if (r.updatedAt < since) continue
          if (r.deletedAt != null) out.tombstones.push({ key: `${table}:${id}`, table, id, deletedAt: r.deletedAt })
          else (out[table] as unknown[]).push(r.row)
        }
      }
      return out
    },
    async push(b) {
      const put = (table: string, id: string, updatedAt: number, deletedAt: number | undefined, row: unknown) => {
        if (!store.has(table)) store.set(table, new Map())
        store.get(table)!.set(id, { updatedAt, deletedAt, row })
      }
      for (const table of ['equipment', 'workouts', 'lessons'] as const)
        for (const r of b[table]) put(table, r.id, r.updatedAt, undefined, r)
      for (const t of b.tombstones) put(t.table, t.id, t.deletedAt, t.deletedAt, null)
    },
  }
}

/** Fresh local database and sync state: simulates another device. */
async function newDevice() {
  await db.delete()
  await db.open()
  localStorage.clear()
  resetSyncState()
}

const mem = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k) => mem.get(k) ?? null,
  setItem: (k, v) => void mem.set(k, v),
  removeItem: (k) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage

beforeEach(async () => {
  store.clear()
  await newDevice()
})

describe('sync', () => {
  it('pushes local data and a fresh device pulls it', async () => {
    const eq = await saveEquipment({ name: 'כדור' })
    const w = await saveWorkout({ name: 'אימון', description: 'd', equipmentIds: [eq.id] })
    await saveLesson({ workoutId: w.id, date: '2026-01-01', time: '10:00', location: 'סטודיו' })
    await syncNow(fakeRemote())

    await newDevice()
    await syncNow(fakeRemote())
    expect(await db.equipment.count()).toBe(1)
    expect((await db.workouts.get(w.id))!.equipmentIds).toEqual([eq.id])
    expect(await db.lessons.count()).toBe(1)
  })

  it('propagates deletions, cascading workout lessons', async () => {
    const w = await saveWorkout({ name: 'x', description: '', equipmentIds: [] })
    await saveLesson({ workoutId: w.id, date: '2026-01-01', time: '10:00', location: '' })
    await syncNow(fakeRemote())

    await newDevice()
    await syncNow(fakeRemote()) // device B has the data
    await deleteWorkout(w.id)
    await syncNow(fakeRemote())

    await newDevice()
    await syncNow(fakeRemote()) // device C sees nothing
    expect(await db.workouts.count()).toBe(0)
    expect(await db.lessons.count()).toBe(0)
  })

  it('last write wins by updatedAt', async () => {
    const w = await saveWorkout({ name: 'old', description: '', equipmentIds: [] })
    await syncNow(fakeRemote())
    await db.workouts.put({ ...w, name: 'newer', updatedAt: w.updatedAt + 1000 })
    await syncNow(fakeRemote()) // pushes the newer one
    await db.workouts.put({ ...w, name: 'stale local', updatedAt: w.updatedAt - 500 })
    await syncNow(fakeRemote())
    expect((await db.workouts.get(w.id))!.name).toBe('newer')
  })

  it('renames a pulled equipment whose name clashes with a different local item', async () => {
    store.set('equipment', new Map([['remote-id', { updatedAt: 5, row: { id: 'remote-id', name: 'כדור', updatedAt: 5 } }]]))
    await saveEquipment({ name: 'כדור' })
    await syncNow(fakeRemote())
    expect((await db.equipment.get('remote-id'))!.name).toBe('כדור (2)')
  })

  it('equipment delete (which edits workouts) syncs consistently', async () => {
    const eq = await saveEquipment({ name: 'a' })
    const w = await saveWorkout({ name: 'w', description: '', equipmentIds: [eq.id] })
    await syncNow(fakeRemote())
    await deleteEquipment(eq.id)
    await syncNow(fakeRemote())

    await newDevice()
    await syncNow(fakeRemote())
    expect(await db.equipment.count()).toBe(0)
    expect((await db.workouts.get(w.id))!.equipmentIds).toEqual([])
  })
})
