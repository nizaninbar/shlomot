import { db } from './db'
import type { Equipment, Lesson, Workout } from './types'

export class DuplicateEquipmentError extends Error {
  constructor() {
    super('duplicate equipment name')
    this.name = 'DuplicateEquipmentError'
  }
}

const newId = () => crypto.randomUUID()

// ---------- Workouts ----------

export type WorkoutDraft = Omit<Workout, 'id' | 'createdAt' | 'updatedAt'>

export async function listWorkouts(): Promise<Workout[]> {
  return db.workouts.orderBy('createdAt').reverse().toArray()
}

export async function getWorkout(id: string): Promise<Workout | undefined> {
  return db.workouts.get(id)
}

export async function saveWorkout(input: WorkoutDraft & { id?: string }): Promise<Workout> {
  const now = Date.now()
  const existing = input.id ? await db.workouts.get(input.id) : undefined
  const workout: Workout = {
    ...input,
    id: input.id ?? newId(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  await db.workouts.put(workout)
  return workout
}

export async function deleteWorkout(id: string): Promise<void> {
  await db.transaction('rw', db.workouts, db.lessons, async () => {
    await db.lessons.where('workoutId').equals(id).delete()
    await db.workouts.delete(id)
  })
}

/** Returns an unsaved draft (no id); the caller saves it via saveWorkout on submit. */
export async function cloneWorkout(sourceId: string): Promise<WorkoutDraft> {
  const source = await db.workouts.get(sourceId)
  if (!source) throw new Error('workout not found')
  return {
    name: `${source.name} – עותק`,
    description: source.description,
    equipmentIds: [...source.equipmentIds],
    basedOnId: source.id,
  }
}

// ---------- Lessons ----------

export async function listLessons(workoutId: string): Promise<Lesson[]> {
  const lessons = await db.lessons.where('workoutId').equals(workoutId).toArray()
  return lessons.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
}

export async function saveLesson(input: Omit<Lesson, 'id' | 'updatedAt'> & { id?: string }): Promise<Lesson> {
  const lesson: Lesson = { ...input, id: input.id ?? newId(), updatedAt: Date.now() }
  await db.lessons.put(lesson)
  return lesson
}

export async function deleteLesson(id: string): Promise<void> {
  await db.lessons.delete(id)
}

/** Distinct, non-empty past locations. */
export async function listLocations(): Promise<string[]> {
  const locations = await db.lessons.orderBy('location').uniqueKeys()
  return (locations as string[]).filter((l) => l.trim() !== '')
}

// ---------- Equipment ----------

export async function listEquipment(): Promise<Equipment[]> {
  const all = await db.equipment.toArray()
  return all.sort((a, b) => a.name.localeCompare(b.name, 'he'))
}

/** Creates (no id) or renames (id). Throws DuplicateEquipmentError on a case-insensitive name clash. */
export async function saveEquipment(input: { id?: string; name: string }): Promise<Equipment> {
  const name = input.name.trim()
  if (!name) throw new Error('empty equipment name')
  return db.transaction('rw', db.equipment, async () => {
    const lower = name.toLowerCase()
    const clash = (await db.equipment.toArray()).some((e) => e.id !== input.id && e.name.toLowerCase() === lower)
    if (clash) throw new DuplicateEquipmentError()
    const item: Equipment = { id: input.id ?? newId(), name, updatedAt: Date.now() }
    await db.equipment.put(item)
    return item
  })
}

/** Removes the equipment and its id from every workout, atomically. */
export async function deleteEquipment(id: string): Promise<void> {
  await db.transaction('rw', db.equipment, db.workouts, async () => {
    const now = Date.now()
    await db.workouts
      .where('equipmentIds')
      .equals(id)
      .modify((w) => {
        w.equipmentIds = w.equipmentIds.filter((e) => e !== id)
        w.updatedAt = now
      })
    await db.equipment.delete(id)
  })
}
