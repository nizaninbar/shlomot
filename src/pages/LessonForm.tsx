import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Mandala from '../components/Mandala'
import { getLesson, listLocations, saveLesson } from '../db/repo'
import type { Lesson } from '../db/types'
import { t } from '../strings'

const pad = (n: number) => String(n).padStart(2, '0')

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function LessonForm() {
  const { id, lessonId } = useParams()
  // Load once: a live query would overwrite what is being typed.
  const [loaded, setLoaded] = useState<{ lessonId?: string; lesson?: Lesson } | null>(lessonId ? null : {})

  useEffect(() => {
    if (!lessonId) return
    let cancelled = false
    getLesson(lessonId).then((lesson) => {
      if (!cancelled) setLoaded({ lessonId, lesson })
    })
    return () => {
      cancelled = true
    }
  }, [lessonId])

  if (!loaded || loaded.lessonId !== lessonId) return null
  if (lessonId && !loaded.lesson) {
    return (
      <>
        <Mandala className="watermark" />
        <p>{t.lesson.notFound}</p>
        <Link to="/">{t.back}</Link>
      </>
    )
  }
  const workoutId = loaded.lesson?.workoutId ?? id ?? ''
  return <Fields key={lessonId ?? 'new'} workoutId={workoutId} lesson={loaded.lesson} />
}

function Fields({ workoutId, lesson }: { workoutId: string; lesson?: Lesson }) {
  const navigate = useNavigate()
  const locations = useLiveQuery(listLocations, [])
  const [date, setDate] = useState(lesson?.date ?? today())
  const [time, setTime] = useState(lesson?.time ?? '')
  const [location, setLocation] = useState(lesson?.location ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!date) {
      setError(t.lesson.dateRequired)
      return
    }
    setSaving(true)
    try {
      await saveLesson({ id: lesson?.id, workoutId, date, time, location: location.trim() })
      navigate(`/workout/${workoutId}`, { replace: true })
    } catch {
      setError(t.lesson.saveFailed)
      setSaving(false)
    }
  }

  return (
    <>
      <Mandala className="watermark" />
      <h1 className="page__title">{lesson ? t.lesson.editTitle : t.lesson.newTitle}</h1>
      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span className="field__label">{t.lesson.date}</span>
          <input className="input input--block" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">{t.lesson.time}</span>
          <input className="input input--block" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">{t.lesson.location}</span>
          <input
            className="input input--block"
            list="locations"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <datalist id="locations">
            {locations?.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </label>
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
