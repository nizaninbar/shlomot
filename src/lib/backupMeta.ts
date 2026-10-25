const KEY = 'shlomot:lastBackup'
export const REMINDER_DAYS = 14

export function getLastBackup(): number | null {
  try {
    const v = Number(localStorage.getItem(KEY))
    return v > 0 ? v : null
  } catch {
    return null
  }
}

export function setLastBackup(ts = Date.now()): void {
  try {
    localStorage.setItem(KEY, String(ts))
  } catch {
    /* storage unavailable */
  }
}

/** Reminder is due when there is data and no backup in the last REMINDER_DAYS days. */
export function backupDue(lastBackup: number | null, firstDataAt: number | null, now = Date.now()): boolean {
  const ref = lastBackup ?? firstDataAt
  if (ref === null) return false
  return now - ref > REMINDER_DAYS * 86_400_000
}
