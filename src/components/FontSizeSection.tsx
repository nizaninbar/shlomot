import { useState } from 'react'
import { FONT_SIZES, getFontSize, setFontSize, type FontSizeLevel } from '../lib/fontSize'
import { t } from '../strings'

export default function FontSizeSection() {
  const [level, setLevel] = useState(getFontSize)

  function choose(next: FontSizeLevel) {
    setFontSize(next)
    setLevel(next)
  }

  return (
    <section className="card card--static font-size">
      <h2 className="font-size__title">{t.settings.fontSize.title}</h2>
      <div className="font-size__options" role="radiogroup" aria-label={t.settings.fontSize.title}>
        {(Object.keys(FONT_SIZES) as FontSizeLevel[]).map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={level === key}
            className={`btn${level === key ? ' btn--primary' : ''}`}
            onClick={() => choose(key)}
          >
            {t.settings.fontSize[key]}
          </button>
        ))}
      </div>
    </section>
  )
}
