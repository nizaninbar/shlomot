import { useRef, useState, type ChangeEvent } from 'react'
import Mandala from '../components/Mandala'
import { exportAll, importAll, InvalidBackupError, parseBackup } from '../db/repo'
import { getLastBackup, setLastBackup } from '../lib/backupMeta'
import { formatDate } from '../lib/formatDate'
import { t } from '../strings'

function isoDay(ts: number) {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export default function Settings() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [last, setLast] = useState(getLastBackup)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function onExport() {
    setMessage('')
    setError('')
    try {
      const data = await exportAll()
      const fileName = `shlomot-backup-${isoDay(data.exportedAt)}.json`
      const file = new File([JSON.stringify(data, null, 2)], fileName, { type: 'application/json' })
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: fileName })
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return
          throw e
        }
      } else {
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      }
      setLastBackup()
      setLast(getLastBackup())
      setMessage(t.settings.exported)
    } catch {
      setError(t.settings.exportFailed)
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setMessage('')
    setError('')
    try {
      const data = parseBackup(JSON.parse(await file.text()))
      const counts = { w: data.workouts.length, l: data.lessons.length, e: data.equipment.length }
      if (!window.confirm(t.settings.confirmImport(counts.w, counts.l, counts.e))) return
      await importAll(data)
      setMessage(t.settings.imported)
    } catch (err) {
      setError(err instanceof InvalidBackupError || err instanceof SyntaxError ? t.settings.invalidFile : t.settings.importFailed)
    }
  }

  return (
    <>
      <Mandala className="watermark" />
      <h1 className="page__title">{t.settings.title}</h1>

      <section className="card card--static">
        <h2 className="card__name">{t.settings.backupTitle}</h2>
        <p className="card__desc">{t.settings.backupText}</p>
        <p className="card__meta">
          {last ? t.settings.lastBackup(formatDate(isoDay(last))) : t.settings.neverBackedUp}
        </p>
        <button className="btn btn--primary" type="button" onClick={onExport}>
          {t.settings.export}
        </button>
      </section>

      <section className="card card--static">
        <h2 className="card__name">{t.settings.restoreTitle}</h2>
        <p className="card__desc">{t.settings.restoreText}</p>
        <button className="btn btn--danger" type="button" onClick={() => fileRef.current?.click()}>
          {t.settings.import}
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
      </section>

      {message && <p role="status">{message}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  )
}
