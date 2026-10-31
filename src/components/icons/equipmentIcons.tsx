import type { ReactNode } from 'react'

// 24x24 line icons drawn with currentColor. Keys are stored in Equipment.icon, so never rename one.
const SOFT = { fill: 'currentColor', fillOpacity: 0.16 }

const PATHS: Record<string, ReactNode> = {
  yogablock: (
    <>
      <path d="M3 9l4-4h14l-4 4z" {...SOFT} />
      <rect x="3" y="9" width="14" height="10" {...SOFT} />
      <path d="M17 9l4-4v10l-4 4z" {...SOFT} />
    </>
  ),
  bandclosed: (
    <>
      <rect x="2" y="7.5" width="20" height="9" rx="4.5" />
      <rect x="5.500" y="10.500" width="13" height="3" rx="1.500" />
    </>
  ),
  bandopen: <path d="M2 8c4-3 6 3 10 0s6 3 10 0v6c-4 3-6-3-10 0s-6-3-10 0z" {...SOFT} />,
  bandhandles: (
    <>
      <rect x="2" y="7" width="5" height="10" rx="2.500" {...SOFT} />
      <rect x="17" y="7" width="5" height="10" rx="2.500" {...SOFT} />
      <path d="M7 10.500h10M7 13.500h10" />
    </>
  ),
  roller: (
    <>
      <path d="M6 6.500h12M6 17.500h12" />
      <ellipse cx="18" cy="12" rx="3" ry="5.500" {...SOFT} />
      <ellipse cx="6" cy="12" rx="3" ry="5.500" {...SOFT} />
    </>
  ),
  pilatesring: (
    <>
      <circle cx="12" cy="12" r="7.500" />
      <circle cx="12" cy="12" r="5" />
      <rect x="1.500" y="9" width="4" height="6" rx="1.500" {...SOFT} />
      <rect x="18.500" y="9" width="4" height="6" rx="1.500" {...SOFT} />
    </>
  ),
  fitball: (
    <>
      <circle cx="12" cy="12" r="10" {...SOFT} />
      <path d="M2.500 9c6 3 13 3 19 0M2.500 15c6-3 13-3 19 0M12 2v20" />
    </>
  ),
  smallball: (
    <>
      <circle cx="12" cy="12" r="6" {...SOFT} />
      <path d="M8.500 9.500a4.500 4.500 0 0 1 3-2.500" />
    </>
  ),
  noequipment: (
    <>
      <circle cx="12" cy="4.500" r="2.500" {...SOFT} />
      <path d="M12 8v7M4 8l8 2 8-2M8.500 21.500L12 15l3.500 6.500" />
    </>
  ),
  weights: (
    <>
      <rect x="2" y="9" width="3" height="6" rx="1" {...SOFT} />
      <rect x="5" y="6.500" width="3.500" height="11" rx="1" {...SOFT} />
      <rect x="15.500" y="6.500" width="3.500" height="11" rx="1" {...SOFT} />
      <rect x="19" y="9" width="3" height="6" rx="1" {...SOFT} />
      <path d="M8.500 12h7" />
    </>
  ),
  mat: (
    <>
      <rect x="9" y="14" width="13" height="4" rx="0.500" {...SOFT} />
      <circle cx="7" cy="13" r="4.500" {...SOFT} />
      <circle cx="7" cy="13" r="1.500" />
    </>
  ),
}

export const EQUIPMENT_ICON_KEYS = Object.keys(PATHS)

type Props = { name?: string; className?: string }

/** The icon for a stored key; unknown or missing keys fall back to a small dot. */
export default function EquipmentIcon({ name, className }: Props) {
  const content = name ? PATHS[name] : undefined
  return (
    <svg
      className={`eq-icon${className ? ` ${className}` : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {content ?? <circle cx="12" cy="12" r="2.5" fill="currentColor" />}
    </svg>
  )
}
