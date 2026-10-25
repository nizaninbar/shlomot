import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import EquipmentChips from '../components/EquipmentChips'
import Mandala from '../components/Mandala'
import { getWorkout, listEquipment, saveWorkout } from '../db/repo'
import type { Workout } from '../db/types'
import { t } from '../strings'

export default function WorkoutForm() {
  const { id } = useParams()
  // Load once: a live query would overwrite what is being typed.
  const [loaded, setLoaded] = useState<{ id?: string; workout?: Workout } | null>(id ? null : { })

  useEffect(() => {
    if (!id) return
    let cancelled = false
    getWorkout(id).then((workout) => {
      if (!cancelled) setLoaded({ id, workout })
    })
    return () => {
      cancelled = true
    }
  }, [id])

  if (!loaded || loaded.id !== id) return null
  if (id && !loaded.workout) {
    return (
      <>
        <Mandala className="watermark" />
        <p>{t.workout.notFound}</p>
        <Link to="/">{t.back}</Link>
      </>
    )
  }
  return <Fields key={id ?? 'new'} workout={loaded.workout} />
}

function Fields({ workout }: { workout?: Workout }) {
  const navigate = useNavigate()
  const equipment = useLiveQuery(listEquipment, [])
  const [name, setName] = useState(workout?.name ?? '')
  const [description, setDescription] = useState(workout?.description ?? '')
  const [equipmentIds, setEquipmentIds] = useState<string[]>(workout?.equipmentIds ?? [])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function toggle(eid: string) {
    setEquipmentIds((cur) => (cur.includes(eid) ? cur.filter((x) => x !== eid) : [...cur, eid]))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError(t.workout.nameRequired)
      return
    }
    setSaving(true)
    try {
      const saved = await saveWorkout({
        id: workout?.id,
        name: name.trim(),
        description: description.trim(),
        equipmentIds,
        basedOnId: workout?.basedOnId,
      })
      navigate(`/workout/${saved.id}`, { replace: true })
    } catch {
      setError(t.workout.saveFailed)
      setSaving(false)
    }
  }

  return (
    <>
      <Mandala className="watermark" />
      <h1 className="page__title">{workout ? t.workout.editTitle : t.workout.newTitle}</h1>
      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span className="field__label">{t.workout.name}</span>
          <input className="input input--block" value={name} onChange={(e) => setName(e.target.value)} autoFocus={!workout} />
        </label>
        <label className="field">
          <span className="field__label">{t.workout.description}</span>
          <textarea
            className="input input--block textarea"
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="field">
          <span className="field__label">{t.workout.equipment}</span>
          {equipment && equipment.length === 0 ? (
            <p className="muted">{t.workout.noEquipment}</p>
          ) : (
            <EquipmentChips items={equipment ?? []} selectedIds={equipmentIds} onToggle={toggle} label={t.workout.equipment} />
          )}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <button className="btn btn--primary" type="submit" disabled={saving}>
            {t.save}
          </button>
          <button className="btn" type="button" onClick={() => navigate(-1)}>
            {t.cancel}
          </button>
        </div>
      </form>
    </>
  )
}
