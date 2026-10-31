import EquipmentIcon from '../components/icons/equipmentIcons'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Mandala from '../components/Mandala'
import { deleteLesson, deleteWorkout, getWorkout, listBasedOn, listEquipment, listLessons } from '../db/repo'
import { formatDate } from '../lib/formatDate'
import { t } from '../strings'

export default function WorkoutDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  // Wrapped so "not found" (undefined) is distinguishable from "still loading".
  const result = useLiveQuery(async () => {
    const workout = await getWorkout(id)
    return { workout, source: workout?.basedOnId ? await getWorkout(workout.basedOnId) : undefined }
  }, [id])
  const lessons = useLiveQuery(() => listLessons(id), [id])
  const derived = useLiveQuery(() => listBasedOn(id), [id])
  const equipment = useLiveQuery(listEquipment, [])

  if (!result) return null
  const { workout, source } = result
  if (!workout) {
    return (
      <>
        <Mandala className="watermark" />
        <p>{t.workout.notFound}</p>
        <Link to="/">{t.back}</Link>
      </>
    )
  }

  const tagged = workout.equipmentIds
    .map((eid) => equipment?.find((e) => e.id === eid))
    .filter((e): e is NonNullable<typeof e> => !!e)

  async function onDelete() {
    if (!workout || !window.confirm(t.workout.confirmDelete(workout.name))) return
    await deleteWorkout(workout.id)
    navigate('/', { replace: true })
  }

  return (
    <>
      <Mandala className="watermark" />
      <Link to="/" className="back">
        {t.back}
      </Link>
      <h1 className="page__title">{workout.name}</h1>
      {tagged.length > 0 && (
        <div className="tags">
          {tagged.map((e) => (
            <span key={e.id} className="tag">
              {e.icon && <EquipmentIcon name={e.icon} />}
              {e.name}
            </span>
          ))}
        </div>
      )}
      {workout.basedOnId && (
        <p className="muted detail__based">
          {source ? (
            <>
              {t.clone.basedOn} <Link to={`/workout/${source.id}`}>{source.name}</Link>
            </>
          ) : (
            t.clone.basedOnDeleted
          )}
        </p>
      )}
      {workout.description && <p className="detail__desc">{workout.description}</p>}
      <div className="actions">
        <Link to={`/workout/${workout.id}/clone`} className="btn btn--link">
          {t.clone.action}
        </Link>
      </div>

      <h2 className="section__title">{t.lesson.title}</h2>
      {lessons && lessons.length === 0 && <p className="muted">{t.lesson.empty}</p>}
      <ul className="list">
        {lessons?.map((l) => (
          <li key={l.id} className="list__item">
            <span className="list__name">
              {formatDate(l.date)} · {l.time}
              {l.location && <span className="muted"> · {l.location}</span>}
            </span>
            <Link to={`/lesson/${l.id}/edit`} className="btn btn--link">
              {t.edit}
            </Link>
            <button
              className="btn btn--danger"
              type="button"
              onClick={() => window.confirm(t.lesson.confirmDelete(formatDate(l.date))) && deleteLesson(l.id)}
            >
              {t.delete}
            </button>
          </li>
        ))}
      </ul>
      <Link to={`/workout/${workout.id}/lesson/new`} className="btn btn--link">
        + {t.lesson.add}
      </Link>

      {derived && derived.length > 0 && (
        <>
          <h2 className="section__title">{t.clone.basedOnThis}</h2>
          <ul className="list">
            {derived.map((d) => (
              <li key={d.id}>
                <Link to={`/workout/${d.id}`} className="card">
                  <span className="card__name">{d.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="actions">
        <Link to={`/workout/${workout.id}/edit`} className="btn btn--primary btn--link">
          {t.edit}
        </Link>
        <button className="btn btn--danger" type="button" onClick={onDelete}>
          {t.delete}
        </button>
      </div>
    </>
  )
}
