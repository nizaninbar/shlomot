import Dexie, { type EntityTable } from 'dexie'
import type { Equipment, Lesson, Workout } from './types'

export const db = new Dexie('shlomot') as Dexie & {
  equipment: EntityTable<Equipment, 'id'>
  workouts: EntityTable<Workout, 'id'>
  lessons: EntityTable<Lesson, 'id'>
}

db.version(1).stores({
  equipment: 'id, &name',
  workouts: 'id, name, createdAt, *equipmentIds, basedOnId',
  lessons: 'id, workoutId, date, location',
})
