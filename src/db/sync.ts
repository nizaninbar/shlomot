// Leftover bookkeeping from the old two-way sync; removed in stage 8.
const PULL_KEY = 'shlomot:syncPull'
const PUSH_KEY = 'shlomot:syncPush'

export const getLastSync = () => {
  try {
    return Number(localStorage.getItem(PUSH_KEY)) || null
  } catch {
    return null
  }
}

export function resetSyncState(): void {
  try {
    localStorage.removeItem(PULL_KEY)
    localStorage.removeItem(PUSH_KEY)
  } catch {
    /* storage unavailable */
  }
}
