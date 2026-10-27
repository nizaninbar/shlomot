import { createClient } from '@libsql/client'
import { describe, expect, it } from 'vitest'
import type { SyncBatch } from './repo'
import { ensureSchema, tursoRemote } from './turso'

const empty = (): SyncBatch => ({ equipment: [], workouts: [], lessons: [], tombstones: [] })

async function remote() {
  const client = createClient({ url: ':memory:' })
  await ensureSchema(client)
  return tursoRemote(client as never)
}

describe('tursoRemote', () => {
  it('round-trips rows and tombstones', async () => {
    const r = await remote()
    await r.push({
      ...empty(),
      equipment: [{ id: 'e1', name: 'כדור', updatedAt: 10 }],
      workouts: [{ id: 'w1', name: 'א', description: 'ב', equipmentIds: ['e1'], basedOnId: 'w0', createdAt: 5, updatedAt: 10 }],
      lessons: [{ id: 'l1', workoutId: 'w1', date: '2026-01-02', time: '09:00', location: 'סטודיו', updatedAt: 10 }],
    })
    const pulled = await r.pull(0)
    expect(pulled.equipment).toEqual([{ id: 'e1', name: 'כדור', updatedAt: 10 }])
    expect(pulled.workouts[0]).toMatchObject({ equipmentIds: ['e1'], basedOnId: 'w0', createdAt: 5 })
    expect(pulled.lessons[0]).toMatchObject({ workoutId: 'w1', location: 'סטודיו' })

    await r.push({ ...empty(), tombstones: [{ key: 'lessons:l1', table: 'lessons', id: 'l1', deletedAt: 20 }] })
    const after = await r.pull(11)
    expect(after.lessons).toEqual([])
    expect(after.tombstones).toEqual([{ key: 'lessons:l1', table: 'lessons', id: 'l1', deletedAt: 20 }])
  })

  it('does not let an older write overwrite a newer one', async () => {
    const r = await remote()
    await r.push({ ...empty(), equipment: [{ id: 'e1', name: 'new', updatedAt: 20 }] })
    await r.push({ ...empty(), equipment: [{ id: 'e1', name: 'old', updatedAt: 10 }] })
    expect((await r.pull(0)).equipment[0].name).toBe('new')
  })
})
