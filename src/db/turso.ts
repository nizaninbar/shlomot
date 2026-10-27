import type { Client, InStatement } from '@libsql/client/web'
import type { Equipment, Lesson, SyncTable, Tombstone, Workout } from './types'
import type { SyncBatch } from './repo'
import type { Remote } from './sync'

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

// Columns mirror src/db/types.ts; deleted_at is a tombstone (set instead of removing the row).
// Every column has a default so a tombstone-only upsert (id, updated_at, deleted_at) is valid.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
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
  'CREATE INDEX IF NOT EXISTS equipment_updated ON equipment (updated_at)',
  'CREATE INDEX IF NOT EXISTS workouts_updated ON workouts (updated_at)',
  'CREATE INDEX IF NOT EXISTS lessons_updated ON lessons (updated_at)',
]

export async function ensureSchema(client: Client): Promise<void> {
  await client.batch(SCHEMA, 'write')
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

// ---------- row mapping (camelCase local <-> snake_case remote) ----------

type Row = Record<string, unknown>

const TABLES: SyncTable[] = ['equipment', 'workouts', 'lessons']
const PAGE = 500

const fromEquipment = (r: Row): Equipment => ({ id: r.id as string, name: r.name as string, updatedAt: Number(r.updated_at) })
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

/** Newer-or-equal wins, so a device with stale data can't overwrite a later edit. */
function upsert(table: SyncTable, cols: string[], args: (string | number | null)[]): InStatement {
  const sets = cols.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`)
  return {
    sql: `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})
      ON CONFLICT(id) DO UPDATE SET ${sets.join(', ')} WHERE excluded.updated_at >= ${table}.updated_at`,
    args,
  }
}

const equipmentStmt = (r: Equipment) =>
  upsert('equipment', ['id', 'name', 'updated_at', 'deleted_at'], [r.id, r.name, r.updatedAt, null])
const workoutStmt = (r: Workout) =>
  upsert(
    'workouts',
    ['id', 'name', 'description', 'equipment_ids', 'based_on_id', 'created_at', 'updated_at', 'deleted_at'],
    [r.id, r.name, r.description, JSON.stringify(r.equipmentIds), r.basedOnId ?? null, r.createdAt, r.updatedAt, null],
  )
const lessonStmt = (r: Lesson) =>
  upsert(
    'lessons',
    ['id', 'workout_id', 'date', 'time', 'location', 'updated_at', 'deleted_at'],
    [r.id, r.workoutId, r.date, r.time, r.location, r.updatedAt, null],
  )
const tombstoneStmt = (t: Tombstone) => upsert(t.table, ['id', 'updated_at', 'deleted_at'], [t.id, t.deletedAt, t.deletedAt])

export function tursoRemote(client: Client): Remote {
  async function fetchTable(table: SyncTable, since: number): Promise<Row[]> {
    const rows: Row[] = []
    for (let offset = 0; ; offset += PAGE) {
      const res = await client.execute({
        sql: `SELECT * FROM ${table} WHERE updated_at >= ? ORDER BY updated_at, id LIMIT ? OFFSET ?`,
        args: [since, PAGE, offset],
      })
      rows.push(...(res.rows as unknown as Row[]))
      if (res.rows.length < PAGE) return rows
    }
  }

  return {
    async pull(since) {
      await ensureSchema(client)
      const [eq, wo, le] = await Promise.all(TABLES.map((t) => fetchTable(t, since)))
      const batch: SyncBatch = { equipment: [], workouts: [], lessons: [], tombstones: [] }
      const sort = (table: SyncTable, rows: Row[], live: (r: Row) => void) => {
        for (const r of rows) {
          if (r.deleted_at != null) {
            batch.tombstones.push({ key: `${table}:${r.id}`, table, id: r.id as string, deletedAt: Number(r.deleted_at) })
          } else live(r)
        }
      }
      sort('equipment', eq, (r) => batch.equipment.push(fromEquipment(r)))
      sort('workouts', wo, (r) => batch.workouts.push(fromWorkout(r)))
      sort('lessons', le, (r) => batch.lessons.push(fromLesson(r)))
      return batch
    },

    async push(batch) {
      const dead = (table: SyncTable) => batch.tombstones.filter((t) => t.table === table).map(tombstoneStmt)
      // Equipment and workouts first: lessons may refer to them.
      const stmts = [
        ...batch.equipment.map(equipmentStmt),
        ...dead('equipment'),
        ...batch.workouts.map(workoutStmt),
        ...dead('workouts'),
        ...batch.lessons.map(lessonStmt),
        ...dead('lessons'),
      ]
      for (let i = 0; i < stmts.length; i += PAGE) await client.batch(stmts.slice(i, i + PAGE), 'write')
    },
  }
}
