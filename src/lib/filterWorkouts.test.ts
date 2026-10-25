import { describe, expect, it } from 'vitest'
import type { Workout } from '../db/types'
import { filterWorkouts } from './filterWorkouts'

const w = (id: string, name: string, description: string, equipmentIds: string[]): Workout => ({
  id,
  name,
  description,
  equipmentIds,
  createdAt: 0,
  updatedAt: 0,
})

const all = [
  w('1', 'Core Burn', 'שיעור בטן', ['mat', 'ball']),
  w('2', 'רגליים', 'עבודה עם גומייה', ['mat']),
  w('3', 'מתיחות', '', []),
]

describe('filterWorkouts', () => {
  it('returns everything with no query and no selection', () => {
    expect(filterWorkouts(all, '', [])).toHaveLength(3)
  })

  it('matches name and description, trimmed and case-insensitive', () => {
    expect(filterWorkouts(all, '  core ', []).map((x) => x.id)).toEqual(['1'])
    expect(filterWorkouts(all, 'גומייה', []).map((x) => x.id)).toEqual(['2'])
  })

  it('treats a whitespace-only query as empty', () => {
    expect(filterWorkouts(all, '   ', [])).toHaveLength(3)
  })

  it('requires ALL selected equipment', () => {
    expect(filterWorkouts(all, '', ['mat']).map((x) => x.id)).toEqual(['1', '2'])
    expect(filterWorkouts(all, '', ['mat', 'ball']).map((x) => x.id)).toEqual(['1'])
  })

  it('combines query and equipment', () => {
    expect(filterWorkouts(all, 'רגליים', ['ball'])).toEqual([])
  })
})
