import type { Client, InStatement } from '@libsql/client/web'
import { db } from './db'
import {
  deleteEquipmentStmts,
  deleteLessonStmt,
  deleteWorkoutStmts,
  fetchSnapshot,
  getTursoClient,
  upsertEquipment,
  upsertLesson,
  upsertWorkout,
} from './turso'
import type { Equipment, Lesson, Workout } from './types'

export class DuplicateEquipmentError extends Error {
  constructor() {
    super('duplicate equipment name')
    this.name = 'DuplicateEquipmentError'
  }
}

/** Turso could not be reached (offline, not configured, or the request failed). Nothing was saved. */
export class OfflineError extends Error {
  constructor(cause?: unknown) {
    super('turso unreachable', { cause })
    this.name = 'OfflineError'
  }
}

const newId = () => crypto.randomUUID()

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

// Bumped by every write so refreshCache can tell its snapshot may predate a write.
let writeEpoch = 0

/**
 * Turso is the only writable store: run the statements there first (one batch = one transaction),
 * and only if that succeeds mirror the change into the Dexie cache.
 */
async function commit(statements: InStatement[], mirror: () => Promise<unknown>): Promise<void> {
  if (isOffline()) throw new OfflineError()
  try {
    const client = await getTursoClient()
    if (!client) throw new OfflineError()
    await client.batch(statements, 'write')
  } catch (e) {
    if (e instanceof OfflineError) throw e
    if (/UNIQUE constraint/i.test(String((e as Error)?.message))) throw new DuplicateEquipmentError()
    throw new OfflineError(e)
  }
  writeEpoch++
  try {
    await mirror()
  } catch (e) {
    console.error('cache write failed; the next refresh will fix it', e) // Turso already has the change
  }
}

/** Replaces the whole cache with a fresh Turso snapshot. Throws OfflineError if Turso can't be read. */
export async function refreshCache(): Promise<void> {
  if (isOffline()) throw new OfflineError()
  for (let attempt = 0; attempt < 3; attempt++) {
    const epoch = writeEpoch
    let snapshot
    try {
      const client: Client | null = await getTursoClient()
      if (!client) throw new OfflineError()
      snapshot = await fetchSnapshot(client)
    } catch (e) {
      throw e instanceof OfflineError ? e : new OfflineError(e)
    }
    if (epoch !== writeEpoch) continue // a write landed meanwhile; this snapshot may be stale
    await db.transaction('rw', db.equipment, db.workouts, db.lessons, async () => {
      await Promise.all([db.equipment.clear(), db.workouts.clear(), db.lessons.clear()])
      await db.equipment.bulkAdd(snapshot.equipment)
      await db.workouts.bulkAdd(snapshot.workouts)
      await db.lessons.bulkAdd(snapshot.lessons)
    })
    return
  }
}

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
  await commit([upsertWorkout(workout)], () => db.workouts.put(workout))
  return workout
}

export async function deleteWorkout(id: string): Promise<void> {
  await commit(deleteWorkoutStmts(id), () =>
    db.transaction('rw', db.workouts, db.lessons, async () => {
      await db.lessons.where('workoutId').equals(id).delete()
      await db.workouts.delete(id)
    }),
  )
}

/** Workouts cloned from the given one, newest first. */
export async function listBasedOn(workoutId: string): Promise<Workout[]> {
  return db.workouts.where('basedOnId').equals(workoutId).reverse().sortBy('createdAt')
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

export async function getLesson(id: string): Promise<Lesson | undefined> {
  return db.lessons.get(id)
}

export async function saveLesson(input: Omit<Lesson, 'id' | 'updatedAt'> & { id?: string }): Promise<Lesson> {
  const lesson: Lesson = { ...input, id: input.id ?? newId(), updatedAt: Date.now() }
  await commit([upsertLesson(lesson)], () => db.lessons.put(lesson))
  return lesson
}

export async function deleteLesson(id: string): Promise<void> {
  await commit([deleteLessonStmt(id)], () => db.lessons.delete(id))
}

/** Distinct, non-empty past locations. */
export async function listLocations(): Promise<string[]> {
  const locations = await db.lessons.orderBy('location').uniqueKeys()
  return (locations as string[]).filter((l) => l.trim() !== '')
}

/** Latest lesson date (YYYY-MM-DD) per workout id. */
export async function lastLessonDates(): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  await db.lessons.each((l) => {
    if (!result[l.workoutId] || l.date > result[l.workoutId]) result[l.workoutId] = l.date
  })
  return result
}

// ---------- Equipment ----------

export async function listEquipment(): Promise<Equipment[]> {
  const all = await db.equipment.toArray()
  return all.sort((a, b) => a.name.localeCompare(b.name, 'he'))
}

/** Creates (no id) or renames (id). Throws DuplicateEquipmentError on a case-insensitive name clash (Turso unique index). */
export async function saveEquipment(input: { id?: string; name: string }): Promise<Equipment> {
  const name = input.name.trim()
  if (!name) throw new Error('empty equipment name')
  const item: Equipment = { id: input.id ?? newId(), name, updatedAt: Date.now() }
  await commit([upsertEquipment(item)], () => db.equipment.put(item))
  return item
}

/** Removes the equipment and its id from every workout, atomically. */
export async function deleteEquipment(id: string): Promise<void> {
  const now = Date.now()
  await commit(deleteEquipmentStmts(id, now), () =>
    db.transaction('rw', db.equipment, db.workouts, async () => {
      await db.workouts
        .where('equipmentIds')
        .equals(id)
        .modify((w) => {
          w.equipmentIds = w.equipmentIds.filter((e) => e !== id)
          w.updatedAt = now
        })
      await db.equipment.delete(id)
    }),
  )
}

// ---------- Backup (removed in stage 8) ----------

export type BackupData = {
  app: 'shlomot'
  version: 1
  exportedAt: number
  equipment: Equipment[]
  workouts: Workout[]
  lessons: Lesson[]
}

export class InvalidBackupError extends Error {
  constructor() {
    super('invalid backup file')
    this.name = 'InvalidBackupError'
  }
}

export async function exportAll(): Promise<BackupData> {
  const [equipment, workouts, lessons] = await Promise.all([
    db.equipment.toArray(),
    db.workouts.toArray(),
    db.lessons.toArray(),
  ])
  return { app: 'shlomot', version: 1, exportedAt: Date.now(), equipment, workouts, lessons }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isStr = (v: unknown) => typeof v === 'string'
const isNum = (v: unknown) => typeof v === 'number'

/** Throws InvalidBackupError unless the parsed JSON has the exact backup shape. */
export function parseBackup(raw: unknown): BackupData {
  if (!isObj(raw) || raw.app !== 'shlomot' || raw.version !== 1) throw new InvalidBackupError()
  const { equipment, workouts, lessons } = raw
  if (!Array.isArray(equipment) || !Array.isArray(workouts) || !Array.isArray(lessons)) throw new InvalidBackupError()
  const ok =
    equipment.every((e) => isObj(e) && isStr(e.id) && isStr(e.name) && isNum(e.updatedAt)) &&
    workouts.every(
      (w) =>
        isObj(w) &&
        isStr(w.id) &&
        isStr(w.name) &&
        isStr(w.description) &&
        Array.isArray(w.equipmentIds) &&
        w.equipmentIds.every(isStr) &&
        (w.basedOnId === undefined || isStr(w.basedOnId)) &&
        isNum(w.createdAt) &&
        isNum(w.updatedAt),
    ) &&
    lessons.every(
      (l) =>
        isObj(l) && isStr(l.id) && isStr(l.workoutId) && isStr(l.date) && isStr(l.time) && isStr(l.location) && isNum(l.updatedAt),
    )
  if (!ok) throw new InvalidBackupError()
  return raw as BackupData
}

/** Replaces the local cache only (not Turso); goes away with the backup feature in stage 8. */
export async function importAll(data: BackupData): Promise<void> {
  await db.transaction('rw', db.equipment, db.workouts, db.lessons, async () => {
    await Promise.all([db.equipment.clear(), db.workouts.clear(), db.lessons.clear()])
    await db.equipment.bulkAdd(data.equipment)
    await db.workouts.bulkAdd(data.workouts)
    await db.lessons.bulkAdd(data.lessons)
  })
}
