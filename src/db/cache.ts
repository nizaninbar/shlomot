import { db } from './db'
import { refreshCache } from './repo'
import { clearTursoConfig, getTursoConfig, saveTursoConfig, testConnection, type TursoConfig } from './turso'

export type ConnectionState = 'ok' | 'offline' | 'error'
export type CacheStatus = { configured: boolean; connection: ConnectionState; refreshing: boolean; at: number | null }

const initial = (): CacheStatus => ({
  configured: getTursoConfig() !== null,
  connection: navigator.onLine ? 'ok' : 'offline',
  refreshing: false,
  at: null,
})

let status = initial()
const listeners = new Set<() => void>()
let running = false

function set(patch: Partial<CacheStatus>) {
  status = { ...status, ...patch }
  listeners.forEach((l) => l())
}

export const subscribeCache = (l: () => void) => {
  listeners.add(l)
  return () => void listeners.delete(l)
}
export const getCacheStatus = () => status

/** Reloads the read cache from Turso. Never throws; the outcome shows in the status. */
export async function refresh(): Promise<void> {
  if (!getTursoConfig() || running) return
  if (!navigator.onLine) return set({ connection: 'offline' })
  running = true
  try {
    set({ refreshing: true })
    await refreshCache()
    set({ connection: 'ok', at: Date.now() })
  } catch (e) {
    console.error(e)
    set({ connection: navigator.onLine ? 'error' : 'offline' })
  } finally {
    running = false
    set({ refreshing: false })
  }
}

/** Verifies the URL + token, stores them on this device, and loads the data. Throws if they don't work. */
export async function connect(config: TursoConfig): Promise<void> {
  await testConnection(config)
  saveTursoConfig(config)
  set({ configured: true, connection: 'ok' })
  void refresh()
}

/** Forgets the URL + token and empties the cache (it belongs to the database just left). */
export async function disconnect(): Promise<void> {
  clearTursoConfig()
  await Promise.all([db.equipment.clear(), db.workouts.clear(), db.lessons.clear()])
  set({ configured: false, at: null })
}

/** Refresh on start, when back online, and when the app is shown again. */
export function startCache(): void {
  window.addEventListener('online', () => void refresh())
  window.addEventListener('offline', () => set({ connection: 'offline' }))
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void refresh())
  void refresh()
}
