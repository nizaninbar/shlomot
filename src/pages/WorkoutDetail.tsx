import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import Mandala from '../components/Mandala'
import { deleteWorkout, getWorkout, listEquipment } from '../db/repo'
import { t } from '../strings'

export default function WorkoutDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  // Wrapped so "not found" (undefined) is distinguishable from "still loading".
  const result = useLiveQuery(async () => ({ workout: await getWorkout(id) }), [id])
  const equipment = useLiveQuery(listEquipment, [])

  if (!result) return null
  const { workout } = result
  if (!workout) {
    return (
      <>
        <Mandala className="watermark" />
        <p>{t.workout.notFound}</p>
        <Link to="/">{t.back}</Link>
      </>
    )
  }

  const names = workout.equipmentIds
    .map((eid) => equipment?.find((e) => e.id === eid)?.name)
    .filter((n): n is string => !!n)

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
      {names.length > 0 && (
        <div className="tags">
          {names.map((n) => (
            <span key={n} className="tag">
              {n}
            </span>
          ))}
        </div>
      )}
      {workout.description && <p className="detail__desc">{workout.description}</p>}
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
