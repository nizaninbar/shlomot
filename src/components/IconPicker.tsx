import EquipmentIcon, { EQUIPMENT_ICON_KEYS } from './icons/equipmentIcons'
import { t } from '../strings'

type Props = { value: string; onChange: (icon: string) => void }

export default function IconPicker({ value, onChange }: Props) {
  return (
    <div className="icon-picker" role="radiogroup" aria-label={t.equipment.iconLabel}>
      {['', ...EQUIPMENT_ICON_KEYS].map((key) => {
        const label = key ? (t.equipment.icons[key] ?? key) : t.equipment.noIcon
        return (
          <button
            key={key || 'none'}
            type="button"
            role="radio"
            aria-checked={value === key}
            className={`icon-picker__btn${value === key ? ' icon-picker__btn--on' : ''}`}
            onClick={() => onChange(key)}
          >
            {key ? <EquipmentIcon name={key} /> : <span className="icon-picker__none" aria-hidden="true">∅</span>}
            <span className="icon-picker__label">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
