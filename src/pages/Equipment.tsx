import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import EmptyState from '../components/EmptyState'
import Mandala from '../components/Mandala'
import { deleteEquipment, DuplicateEquipmentError, listEquipment, OfflineError, saveEquipment } from '../db/repo'
import { t } from '../strings'

export default function Equipment() {
  const items = useLiveQuery(listEquipment, [])
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<unknown>): Promise<boolean> {
    setBusy(true)
    try {
      await action()
      setError('')
      return true
    } catch (e) {
      setError(
        e instanceof DuplicateEquipmentError
          ? t.equipment.duplicate
          : e instanceof OfflineError
            ? t.connection.saveOffline
            : t.equipment.saveFailed,
      )
      return false
    } finally {
      setBusy(false)
    }
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    if (await run(() => saveEquipment({ name: newName }))) setNewName('')
  }

  async function onRename(e: FormEvent) {
    e.preventDefault()
    if (!editingId || !editName.trim()) return
    if (await run(() => saveEquipment({ id: editingId, name: editName }))) setEditingId(null)
  }

  async function onDelete(id: string, name: string) {
    if (window.confirm(t.equipment.confirmDelete(name))) await run(() => deleteEquipment(id))
  }

  return (
    <>
      <Mandala className="watermark" />
      <h1 className="page__title">{t.equipment.title}</h1>

      <form className="row-form" onSubmit={onAdd}>
        <input
          className="input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t.equipment.newPlaceholder}
          aria-label={t.equipment.newPlaceholder}
        />
        <button className="btn btn--primary" type="submit" disabled={busy}>
          {t.equipment.add}
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {items && items.length === 0 && <EmptyState title={t.equipment.emptyTitle} text={t.equipment.emptyText} />}

      <ul className="list">
        {items?.map((item) => (
          <li key={item.id} className="list__item">
            {editingId === item.id ? (
              <form className="row-form" onSubmit={onRename}>
                <input
                  className="input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  aria-label={t.equipment.rename}
                  autoFocus
                />
                <button className="btn btn--primary" type="submit" disabled={busy}>
                  {t.save}
                </button>
                <button className="btn" type="button" onClick={() => setEditingId(null)}>
                  {t.cancel}
                </button>
              </form>
            ) : (
              <>
                <span className="list__name">{item.name}</span>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setEditingId(item.id)
                    setEditName(item.name)
                    setError('')
                  }}
                >
                  {t.equipment.rename}
                </button>
                <button className="btn btn--danger" type="button" disabled={busy} onClick={() => onDelete(item.id, item.name)}>
                  {t.delete}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
