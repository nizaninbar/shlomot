import { useSyncExternalStore } from 'react'
import { disconnect, getCacheStatus, refresh, subscribeCache } from '../db/cache'
import { getTursoConfig } from '../db/turso'
import { t } from '../strings'

const s = t.connection

/** Settings card: which database this device is connected to, reload, disconnect. */
export default function SyncSection() {
  const status = useSyncExternalStore(subscribeCache, getCacheStatus)
  const config = getTursoConfig()
  if (!config) return null
  const at = status.at && new Date(status.at).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })

  return (
    <section className="card card--static">
      <h2 className="card__name">{s.title}</h2>
      <p className="card__desc">{s.text}</p>
      <p className="card__meta" dir="ltr">
        {s.connectedTo(new URL(config.url.replace(/^libsql:/, 'https:')).host)}
      </p>
      <p className="card__meta" role="status">
        {status.refreshing ? s.refreshing : at ? s.lastRefresh(at) : ''}
      </p>
      <button className="btn btn--primary" type="button" disabled={status.refreshing} onClick={() => void refresh()}>
        {s.refreshNow}
      </button>
      <button
        className="btn btn--link"
        type="button"
        onClick={() => window.confirm(s.confirmDisconnect) && void disconnect()}
      >
        {s.disconnect}
      </button>
    </section>
  )
}
