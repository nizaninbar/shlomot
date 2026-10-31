import type { Client, InStatement } from '@libsql/client/web'
import type { Equipment, Lesson, Workout } from './types'

const URL_KEY = 'shlomot:tursoUrl'
const TOKEN_KEY = 'shlomot:tursoToken'

export type TursoConfig = { url: string; token: string }

// The token stays on this device only: it is typed into Settings, never built into the app.
export function getTursoConfig(): TursoConfig | null {
  try {
    const url = localStorage.getItem(URL_KEY)
    const token = localStorage.getItem(TOKEN_KEY)
    return url && token ? { url, token } : null
  } catch {
    return null
  }
}

export function saveTursoConfig(config: TursoConfig): void {
  try {
    localStorage.setItem(URL_KEY, config.url)
    localStorage.setItem(TOKEN_KEY, config.token)
  } catch {
    /* storage unavailable */
  }
}

export function clearTursoConfig(): void {
  try {
    localStorage.removeItem(URL_KEY)
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable */
  }
}

export const isSyncConfigured = () => getTursoConfig() !== null

/** Loaded lazily so the libSQL library stays out of the main bundle. */
export async function createTursoClient({ url, token }: TursoConfig): Promise<Client> {
  const { createClient } = await import('@libsql/client/web')
  // The browser client speaks HTTP only; `turso db show --url` prints libsql://.
  return createClient({ url: url.trim().replace(/^libsql:\/\//, 'https://'), authToken: token.trim() })
}

// Columns mirror src/db/types.ts. Turso is the source of truth and rows are really deleted;
// deleted_at is a leftover from the old tombstone sync and is never written any more.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    icon TEXT,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    equipment_ids TEXT NOT NULL DEFAULT '[]',
    based_on_id TEXT,
    created_at INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    workout_id TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL DEFAULT '',
    time TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  )`,
  // Rows tombstoned by the old sync are now just garbage (and could clash with the unique name).
  'DELETE FROM equipment WHERE deleted_at IS NOT NULL',
  'DELETE FROM workouts WHERE deleted_at IS NOT NULL',
  'DELETE FROM lessons WHERE deleted_at IS NOT NULL',
  'CREATE UNIQUE INDEX IF NOT EXISTS equipment_name_lower ON equipment (lower(name))',
  'CREATE INDEX IF NOT EXISTS lessons_workout ON lessons (workout_id)',
]

export async function ensureSchema(client: Client): Promise<void> {
  await client.batch(SCHEMA, 'write')
  // Tables created before stage 9 have no icon column; CREATE TABLE IF NOT EXISTS won't add it.
  const columns = await client.execute('PRAGMA table_info(equipment)')
  if (!columns.rows.some((r) => r.name === 'icon')) await client.execute('ALTER TABLE equipment ADD COLUMN icon TEXT')
}

/** Checks the URL and token work and creates the tables. Throws when they don't. */
export async function testConnection(config: TursoConfig): Promise<void> {
  const client = await createTursoClient(config)
  try {
    await ensureSchema(client)
  } finally {
    client.close()
  }
}

// ---------- shared client ----------

let shared: { key: string; client: Promise<Client> } | null = null
let override: Client | null = null

/** Tests inject a fake client here; pass null to go back to the configured one. */
export function setTursoClient(client: Client | null): void {
  override = client
  shared = null
}

/**
 * The one client the data layer writes through, created lazily with the schema ensured once.
 * Returns null when this device has no URL/token yet.
 */
export async function getTursoClient(): Promise<Client | null> {
  const config = override ? { url: 'override', token: '' } : getTursoConfig()
  if (!config) return null
  const key = `${config.url}
${config.token}`
  if (!shared || shared.key !== key) {
    const pending = (async () => {
      const client = override ?? (await createTursoClient(config))
      await ensureSchema(client)
      return client
    })()
    const entry = { key, client: pending }
    shared = entry
    // A failed start (offline, bad token) must not stick: the next call tries again.
    pending.catch(() => {
      if (shared === entry) shared = null
    })
  }
  return shared.client
}

// ---------- row mapping (camelCase local <-> snake_case remote) ----------

type Row = Record<string, unknown>

const fromEquipment = (r: Row): Equipment => ({
  id: r.id as string,
  name: r.name as string,
  ...(r.icon ? { icon: r.icon as string } : {}),
  updatedAt: Number(r.updated_at),
})
const fromWorkout = (r: Row): Workout => ({
  id: r.id as string,
  name: r.name as string,
  description: r.description as string,
  equipmentIds: JSON.parse((r.equipment_ids as string) || '[]') as string[],
  ...(r.based_on_id ? { basedOnId: r.based_on_id as string } : {}),
  createdAt: Number(r.created_at),
  updatedAt: Number(r.updated_at),
})
const fromLesson = (r: Row): Lesson => ({
  id: r.id as string,
  workoutId: r.workout_id as string,
  date: r.date as string,
  time: r.time as string,
  location: r.location as string,
  updatedAt: Number(r.updated_at),
})

export type Snapshot = { equipment: Equipment[]; workouts: Workout[]; lessons: Lesson[] }

/** Everything in the database, read in one batch so the three tables are consistent. */
export async function fetchSnapshot(client: Client): Promise<Snapshot> {
  const [eq, wo, le] = await client.batch(
    ['SELECT * FROM equipment', 'SELECT * FROM workouts', 'SELECT * FROM lessons'],
    'read',
  )
  return {
    equipment: (eq.rows as unknown as Row[]).map(fromEquipment),
    workouts: (wo.rows as unknown as Row[]).map(fromWorkout),
    lessons: (le.rows as unknown as Row[]).map(fromLesson),
  }
}

// ---------- statements ----------

function upsert(table: string, cols: string[], args: (string | number | null)[]): InStatement {
  const sets = cols.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`)
  return {
    sql: `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})
      ON CONFLICT(id) DO UPDATE SET ${sets.join(', ')}`,
    args,
  }
}

export const upsertEquipment = (r: Equipment) =>
  upsert('equipment', ['id', 'name', 'icon', 'updated_at'], [r.id, r.name, r.icon ?? null, r.updatedAt])
export const upsertWorkout = (r: Workout) =>
  upsert(
    'workouts',
    ['id', 'name', 'description', 'equipment_ids', 'based_on_id', 'created_at', 'updated_at'],
    [r.id, r.name, r.description, JSON.stringify(r.equipmentIds), r.basedOnId ?? null, r.createdAt, r.updatedAt],
  )
export const upsertLesson = (r: Lesson) =>
  upsert(
    'lessons',
    ['id', 'workout_id', 'date', 'time', 'location', 'updated_at'],
    [r.id, r.workoutId, r.date, r.time, r.location, r.updatedAt],
  )

export const deleteWorkoutStmts = (id: string): InStatement[] => [
  { sql: 'DELETE FROM lessons WHERE workout_id = ?', args: [id] },
  { sql: 'DELETE FROM workouts WHERE id = ?', args: [id] },
]

export const deleteLessonStmt = (id: string): InStatement => ({ sql: 'DELETE FROM lessons WHERE id = ?', args: [id] })

/** Strips the id from every workout that uses it (done in SQL, so a stale cache can't miss one), then deletes it. */
export const deleteEquipmentStmts = (id: string, now: number): InStatement[] => [
  {
    sql: `UPDATE workouts
      SET equipment_ids = (SELECT json_group_array(value) FROM json_each(workouts.equipment_ids) WHERE value != ?),
          updated_at = ?
      WHERE EXISTS (SELECT 1 FROM json_each(workouts.equipment_ids) WHERE value = ?)`,
    args: [id, now, id],
  },
  { sql: 'DELETE FROM equipment WHERE id = ?', args: [id] },
]
