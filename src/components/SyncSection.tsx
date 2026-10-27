import { useState, useSyncExternalStore, type FormEvent } from 'react'
import { getSyncStatus, runSync, subscribeSync } from '../db/autosync'
import { getLastSync, resetSyncState } from '../db/sync'
import { clearTursoConfig, getTursoConfig, saveTursoConfig, testConnection } from '../db/turso'
import { t } from '../strings'

const s = t.settings.sync

/** Cloud sync card for Settings: paste the Turso URL + token once per device, then sync manually or automatically. */
export default function SyncSection() {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus)
  const [config, setConfig] = useState(getTursoConfig)
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onConnect(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const next = { url: url.trim(), token: token.trim() }
      await testConnection(next)
      saveTursoConfig(next)
      setConfig(next)
      setToken('')
      resetSyncState() // first sync for this database is a full one
      void runSync()
    } catch {
      setError(s.connectFailed)
    } finally {
      setBusy(false)
    }
  }

  function onDisconnect() {
    clearTursoConfig()
    resetSyncState()
    setConfig(null)
  }

  const last = status.at ?? getLastSync()
  const lastText = last
    ? s.lastSync(new Date(last).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }))
    : s.neverSynced

  return (
    <section className="card card--static">
      <h2 className="card__name">{s.title}</h2>
      <p className="card__desc">{s.text}</p>

      {config ? (
        <>
          <p className="card__meta" dir="ltr">
            {s.connectedTo(new URL(config.url.replace(/^libsql:/, 'https:')).host)}
          </p>
          <p className="card__meta" role="status">
            {status.state === 'syncing' ? s.syncing : lastText}
          </p>
          {status.state === 'error' && (
            <p className="error" role="alert">
              {navigator.onLine ? s.failed : s.offline}
            </p>
          )}
          <button className="btn btn--primary" type="button" disabled={status.state === 'syncing'} onClick={() => void runSync()}>
            {s.syncNow}
          </button>
          <button className="btn btn--link" type="button" onClick={onDisconnect}>
            {s.disconnect}
          </button>
        </>
      ) : (
        <form onSubmit={onConnect}>
          <label className="field">
            <span className="field__label">{s.dbUrl}</span>
            <input
              className="input input--block"
              type="url"
              dir="ltr"
              autoComplete="off"
              placeholder="libsql://…turso.io"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="field__label">{s.dbToken}</span>
            <input
              className="input input--block"
              type="password"
              dir="ltr"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </label>
          <button className="btn btn--primary" type="submit" disabled={busy}>
            {s.connect}
          </button>
        </form>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
