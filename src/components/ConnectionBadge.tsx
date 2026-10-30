import { useSyncExternalStore } from 'react'
import { getCacheStatus, subscribeCache } from '../db/cache'
import { t } from '../strings'

/** Small header dot + label: connected, offline (read-only) or Turso unreachable. */
export default function ConnectionBadge() {
  const { configured, connection } = useSyncExternalStore(subscribeCache, getCacheStatus)
  if (!configured) return null
  return (
    <span className={`conn conn--${connection}`} role="status">
      <span className="conn__dot" aria-hidden="true" />
      {t.connection.state[connection]}
    </span>
  )
}
