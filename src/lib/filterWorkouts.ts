import type { Workout } from '../db/types'

/** Name + description substring match (trimmed, case-insensitive); selected equipment is AND. */
export function filterWorkouts(workouts: Workout[], query: string, selectedIds: string[]): Workout[] {
  const q = query.trim().toLowerCase()
  return workouts.filter((w) => {
    if (q && !`${w.name}\n${w.description}`.toLowerCase().includes(q)) return false
    return selectedIds.every((id) => w.equipmentIds.includes(id))
  })
}
