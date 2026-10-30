import { useState, type FormEvent } from 'react'
import { connect } from '../db/cache'
import { t } from '../strings'

const s = t.connection

/** URL + token fields, shown on the setup screen. The values stay on this device (localStorage). */
export default function ConnectForm() {
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await connect({ url: url.trim(), token: token.trim() })
    } catch {
      setError(navigator.onLine ? s.connectFailed : s.offline)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit}>
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
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn--primary" type="submit" disabled={busy}>
        {s.connect}
      </button>
    </form>
  )
}
