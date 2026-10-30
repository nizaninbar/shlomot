import { describe, expect, it } from 'vitest'
import { fakeTurso } from './fakeTurso'
import { deleteEquipmentStmts, ensureSchema, fetchSnapshot, upsertEquipment, upsertWorkout } from './turso'

async function setup() {
  const fake = fakeTurso()
  await ensureSchema(fake.client)
  return fake
}

describe('turso schema and statements', () => {
  it('round-trips rows through a snapshot', async () => {
    const { client } = await setup()
    await client.batch(
      [
        upsertEquipment({ id: 'e1', name: 'כדור', updatedAt: 10 }),
        upsertWorkout({ id: 'w1', name: 'א', description: 'ב', equipmentIds: ['e1'], basedOnId: 'w0', createdAt: 5, updatedAt: 10 }),
      ],
      'write',
    )
    const snap = await fetchSnapshot(client)
    expect(snap.equipment).toEqual([{ id: 'e1', name: 'כדור', updatedAt: 10 }])
    expect(snap.workouts[0]).toMatchObject({ equipmentIds: ['e1'], basedOnId: 'w0', createdAt: 5 })
  })

  it('unique index on lower(name) rejects case-insensitive duplicates', async () => {
    const { client } = await setup()
    await client.batch([upsertEquipment({ id: 'a', name: 'Ball', updatedAt: 1 })], 'write')
    await expect(client.batch([upsertEquipment({ id: 'b', name: 'BALL', updatedAt: 2 })], 'write')).rejects.toThrow(/UNIQUE/i)
  })

  it('schema setup drops rows tombstoned by the old sync', async () => {
    const { client, real } = await setup()
    await real.execute({ sql: "INSERT INTO equipment (id, name, updated_at, deleted_at) VALUES ('x', 'כדור', 1, 2)", args: [] })
    await ensureSchema(client)
    expect((await fetchSnapshot(client)).equipment).toEqual([])
  })

  it('deleteEquipmentStmts strips the id from workouts that use it and leaves others alone', async () => {
    const { client } = await setup()
    await client.batch(
      [
        upsertEquipment({ id: 'a', name: 'א', updatedAt: 1 }),
        upsertEquipment({ id: 'b', name: 'ב', updatedAt: 1 }),
        upsertWorkout({ id: 'w1', name: '1', description: '', equipmentIds: ['a', 'b'], createdAt: 1, updatedAt: 1 }),
        upsertWorkout({ id: 'w2', name: '2', description: '', equipmentIds: ['a'], createdAt: 1, updatedAt: 1 }),
        upsertWorkout({ id: 'w3', name: '3', description: '', equipmentIds: ['b'], createdAt: 1, updatedAt: 1 }),
      ],
      'write',
    )
    await client.batch(deleteEquipmentStmts('a', 50), 'write')
    const snap = await fetchSnapshot(client)
    const by = Object.fromEntries(snap.workouts.map((w) => [w.id, w]))
    expect(by.w1.equipmentIds).toEqual(['b'])
    expect(by.w2.equipmentIds).toEqual([])
    expect(by.w3).toMatchObject({ equipmentIds: ['b'], updatedAt: 1 })
    expect(snap.equipment.map((e) => e.id)).toEqual(['b'])
  })
})
