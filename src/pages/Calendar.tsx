import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import EquipmentIcon from '../components/icons/equipmentIcons'
import Mandala from '../components/Mandala'
import { listEquipment, listLessonsInRange, listWorkouts } from '../db/repo'
import { buildMonthGrid, capIcons, groupLessonsByDay, monthRange, toIso } from '../lib/calendar'
import { formatDate } from '../lib/formatDate'
import { t } from '../strings'

function todayIso() {
  const n = new Date()
  return toIso(n.getFullYear(), n.getMonth(), n.getDate())
}

export default function Calendar() {
  const now = new Date()
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [selected, setSelected] = useState<string>(todayIso())
  const { start, end } = monthRange(view.year, view.month)
  const lessons = useLiveQuery(() => listLessonsInRange(start, end), [start, end])
  const workouts = useLiveQuery(listWorkouts, [])
  const equipment = useLiveQuery(listEquipment, [])

  const grid = buildMonthGrid(view.year, view.month)
  const days = groupLessonsByDay(lessons ?? [], workouts ?? [])
  const iconOf = (id: string) => equipment?.find((e) => e.id === id)?.icon
  const today = todayIso()

  function shift(delta: number) {
    const d = new Date(view.year, view.month + delta, 1)
    setView({ year: d.getFullYear(), month: d.getMonth() })
  }
  function goToday() {
    setView({ year: now.getFullYear(), month: now.getMonth() })
    setSelected(today)
  }

  const selectedInfo = days[selected]

  return (
    <>
      <Mandala className="watermark" />
      <h1 className="page__title">{t.calendar.title}</h1>
      <div className="cal__nav">
        <button type="button" className="btn cal__arrow" onClick={() => shift(-1)} aria-label={t.calendar.prev}>
          ›
        </button>
        <span className="cal__month">
          {t.calendar.months[view.month]} {view.year}
        </span>
        <button type="button" className="btn cal__arrow" onClick={() => shift(1)} aria-label={t.calendar.next}>
          ‹
        </button>
        <button type="button" className="btn" onClick={goToday}>
          {t.calendar.today}
        </button>
      </div>

      <div className="cal__grid">
        {t.calendar.weekdays.map((w) => (
          <div key={w} className="cal__weekday">
            {w}
          </div>
        ))}
        {grid.flat().map((c) => {
          const info = days[c.date]
          const { shown, extra } = capIcons(info?.equipmentIds ?? [])
          const cls = [
            'cal__day',
            !c.inMonth && 'cal__day--out',
            c.date === today && 'cal__day--today',
            c.date === selected && 'cal__day--sel',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button key={c.date} type="button" className={cls} onClick={() => setSelected(c.date)} aria-pressed={c.date === selected}>
              <span className="cal__num">{c.day}</span>
              {info && (
                <span className="cal__icons">
                  {shown.map((id) => (
                    <EquipmentIcon key={id} name={iconOf(id)} />
                  ))}
                  {extra > 0 && <span className="cal__more">+{extra}</span>}
                  {shown.length === 0 && <span className="cal__dot" />}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <h2 className="section__title">{formatDate(selected)}</h2>
      {(!selectedInfo || selectedInfo.lessons.length === 0) && <p className="muted">{t.calendar.noLessons}</p>}
      <ul className="list">
        {selectedInfo?.lessons.map(({ lesson, workout }) => (
          <li key={lesson.id}>
            {workout ? (
              <Link to={`/workout/${workout.id}`} className="card cal__lesson">
                <span className="card__name">
                  {lesson.time} · {workout.name}
                </span>
                {lesson.location && <span className="muted">{lesson.location}</span>}
                <span className="cal__lesson-icons">
                  {workout.equipmentIds.map((id) => (
                    <EquipmentIcon key={id} name={iconOf(id)} />
                  ))}
                </span>
              </Link>
            ) : (
              <span className="card cal__lesson">
                <span className="card__name">
                  {lesson.time} · {t.calendar.unknownWorkout}
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
