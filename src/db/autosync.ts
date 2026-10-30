import { refreshCache } from './repo'
import { getTursoConfig } from './turso'

export type SyncStatus = { state: 'idle' | 'syncing' | 'error'; at: number | null }

let status: SyncStatus = { state: 'idle', at: null }
const listeners = new Set<() => void>()
let running = false
let timer: ReturnType<typeof setTimeout> | undefined

function set(next: SyncStatus) {
  status = next
  listeners.forEach((l) => l())
}

export const subscribeSync = (l: () => void) => {
  listeners.add(l)
  return () => void listeners.delete(l)
}
export const getSyncStatus = () => status

/** Runs one sync if connected and online. Never throws; failures show as state 'error'. */
export async function runSync(): Promise<void> {
  const config = getTursoConfig()
  if (!config || running || !navigator.onLine) return
  running = true
  try {
    set({ ...status, state: 'syncing' })
    await refreshCache()
    set({ state: 'idle', at: Date.now() })
  } catch (e) {
    console.error(e)
    set({ ...status, state: 'error' })
  } finally {
    running = false
  }
}

function schedule(ms: number) {
  clearTimeout(timer)
  timer = setTimeout(runSync, ms)
}

/** Sync on start, when back online, when the app is shown again, and shortly after local edits. */
export function startAutoSync(): void {
  window.addEventListener('online', () => schedule(0))
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && schedule(0))
  schedule(0)
}
