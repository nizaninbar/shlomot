import EquipmentIcon from './icons/equipmentIcons'
import type { Equipment } from '../db/types'

type Props = {
  items: Equipment[]
  selectedIds: string[]
  onToggle: (id: string) => void
  label: string
  /** 'scroll' = single horizontal row; 'wrap' = multiple lines */
  layout?: 'scroll' | 'wrap'
}

export default function EquipmentChips({ items, selectedIds, onToggle, label, layout = 'wrap' }: Props) {
  return (
    <div className={`chips chips--${layout}`} role="group" aria-label={label}>
      {items.map((item) => {
        const on = selectedIds.includes(item.id)
        return (
          <button
            key={item.id}
            type="button"
            className={`chip${on ? ' chip--on' : ''}`}
            aria-pressed={on}
            onClick={() => onToggle(item.id)}
          >
            {item.icon && <EquipmentIcon name={item.icon} />}
            {item.name}
          </button>
        )
      })}
    </div>
  )
}
