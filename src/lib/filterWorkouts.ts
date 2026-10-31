import type { Workout } from '../db/types'

/** Name + description + equipment-name substring match (trimmed, case-insensitive); selected equipment is AND. */
export function filterWorkouts(
  workouts: Workout[],
  query: string,
  selectedIds: string[],
  equipmentNames: Map<string, string> = new Map(),
): Workout[] {
  const q = query.trim().toLowerCase()
  return workouts.filter((w) => {
    if (q) {
      const eq = w.equipmentIds.map((id) => equipmentNames.get(id) ?? '')
      if (!`${w.name}\n${w.description}\n${eq.join('\n')}`.toLowerCase().includes(q)) return false
    }
    return selectedIds.every((id) => w.equipmentIds.includes(id))
  })
}
