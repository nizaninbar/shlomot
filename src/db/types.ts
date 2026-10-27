export type Equipment = { id: string; name: string; updatedAt: number }

export type Workout = {
  id: string
  name: string
  description: string
  equipmentIds: string[]
  basedOnId?: string
  createdAt: number
  updatedAt: number
}

export type Lesson = {
  id: string
  workoutId: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  location: string
  updatedAt: number
}

/** Local record of a deletion, so sync can propagate it. key = `${table}:${id}`. */
export type SyncTable = 'equipment' | 'workouts' | 'lessons'
export type Tombstone = { key: string; table: SyncTable; id: string; deletedAt: number }
