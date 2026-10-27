import { applyRemote, listChangedSince, type SyncBatch } from './repo'

/** What sync needs from a backend; the Turso implementation lives in `turso.ts`. */
export type Remote = {
  /** Rows (and deletions) with updatedAt >= since, oldest first. */
  pull(since: number): Promise<SyncBatch>
  push(batch: SyncBatch): Promise<void>
}

const PULL_KEY = 'shlomot:syncPull'
const PUSH_KEY = 'shlomot:syncPush'

function readNum(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0
  } catch {
    return 0
  }
}

function writeNum(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    /* storage unavailable */
  }
}

export const getLastSync = () => readNum(PUSH_KEY) || null

/** Forget sync progress, e.g. on sign-out or switching account: the next sync is a full one. */
export function resetSyncState(): void {
  writeNum(PULL_KEY, 0)
  writeNum(PUSH_KEY, 0)
}

const maxStamp = (b: SyncBatch) =>
  Math.max(
    0,
    ...b.equipment.map((r) => r.updatedAt),
    ...b.workouts.map((r) => r.updatedAt),
    ...b.lessons.map((r) => r.updatedAt),
    ...b.tombstones.map((r) => r.deletedAt),
  )

/** Pull first (so stale local rows lose), then push local changes. Last write wins by updatedAt. */
export async function syncNow(remote: Remote): Promise<void> {
  const started = Date.now()

  const since = readNum(PULL_KEY)
  const pulled = await remote.pull(since)
  await applyRemote(pulled)
  writeNum(PULL_KEY, Math.max(since, maxStamp(pulled)))

  const changed = await listChangedSince(readNum(PUSH_KEY))
  const any = changed.equipment.length + changed.workouts.length + changed.lessons.length + changed.tombstones.length
  if (any > 0) await remote.push(changed)
  writeNum(PUSH_KEY, started)
}
