import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import EmptyState from '../components/EmptyState'
import EquipmentChips from '../components/EquipmentChips'
import Mandala from '../components/Mandala'
import { backupDue, getLastBackup } from '../lib/backupMeta'
import { lastLessonDates, listEquipment, listWorkouts } from '../db/repo'
import { filterWorkouts } from '../lib/filterWorkouts'
import { formatDate } from '../lib/formatDate'
import { t } from '../strings'

export default function Home() {
  const workouts = useLiveQuery(listWorkouts, [])
  const equipment = useLiveQuery(listEquipment, [])
  const lastDates = useLiveQuery(lastLessonDates, [])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const equipmentName = useMemo(() => new Map(equipment?.map((e) => [e.id, e.name])), [equipment])
  const visible = useMemo(() => filterWorkouts(workouts ?? [], query, selected), [workouts, query, selected])

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  }

  return (
    <>
      <Mandala className="watermark" />
      <h1 className="page__title">{t.home.title}</h1>

      {workouts && workouts.length > 0 && backupDue(getLastBackup(), Math.min(...workouts.map((w) => w.createdAt))) && (
        <p className="notice" role="status">
          {t.settings.reminder} <Link to="/settings">{t.settings.reminderAction}</Link>
        </p>
      )}

      {workouts && workouts.length > 0 && (
        <>
          <input
            className="input input--block"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.home.searchPlaceholder}
            aria-label={t.home.searchPlaceholder}
          />
          {equipment && equipment.length > 0 && (
            <EquipmentChips
              items={equipment}
              selectedIds={selected}
              onToggle={toggle}
              label={t.home.filterLabel}
              layout="scroll"
            />
          )}
        </>
      )}

      {workouts && workouts.length === 0 && <EmptyState title={t.home.emptyTitle} text={t.home.emptyText} />}
      {workouts && workouts.length > 0 && visible.length === 0 && (
        <EmptyState title={t.home.noResultsTitle} text={t.home.noResultsText} />
      )}

      <ul className="list">
        {visible.map((w) => {
          const last = lastDates?.[w.id]
          return (
            <li key={w.id}>
              <Link to={`/workout/${w.id}`} className="card">
                <span className="card__name">{w.name}</span>
                {w.description && <span className="card__desc">{w.description}</span>}
                {w.equipmentIds.length > 0 && (
                  <span className="tags">
                    {w.equipmentIds.map((id) => (
                      <span key={id} className="tag">
                        {equipmentName.get(id) ?? ''}
                      </span>
                    ))}
                  </span>
                )}
                <span className="card__meta">{last ? t.home.lastTaught(formatDate(last)) : t.home.neverTaught}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      <Link to="/workout/new" className="fab">
        + {t.home.newWorkout}
      </Link>
    </>
  )
}
