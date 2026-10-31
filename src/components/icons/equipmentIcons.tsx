import type { ReactNode } from 'react'

// 24x24 line icons drawn with currentColor. Keys are stored in Equipment.icon, so never rename one.
const PATHS: Record<string, ReactNode> = {
  ball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </>
  ),
  band: (
    <>
      <ellipse cx="12" cy="12" rx="9" ry="5" />
      <path d="M3 12c0 3 4 5 9 5s9-2 9-5" />
    </>
  ),
  mat: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="1" />
      <circle cx="17" cy="12" r="3" />
    </>
  ),
  weights: (
    <>
      <path d="M7 8v8M17 8v8M4 10v4M20 10v4M7 12h10" />
    </>
  ),
  ring: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="5" />
    </>
  ),
  roller: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="4" />
      <path d="M8 8v8M16 8v8" />
    </>
  ),
  pole: <path d="M5 19L19 5M4 16l4 4M16 4l4 4" />,
  chair: <path d="M7 4v9h10v7M7 13v7M5 13h14M17 4v9" />,
  towel: (
    <>
      <path d="M5 5h14v14H5z" />
      <path d="M5 9h14M9 5v14" />
    </>
  ),
  bottle: <path d="M10 3h4v3l2 3v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3zM8 13h8" />,
  heart: <path d="M12 20S4 15 4 9a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6-8 11-8 11z" />,
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  leaf: <path d="M5 19C5 9 11 5 20 4c0 9-4 15-14 15zM5 19l8-8" />,
  flower: (
    <>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 9.5C10 6 12 3 12 3s2 3 0 6.5M12 14.5c-2 3.500 0 6.500 0 6.500s2-3 0-6.500M9.500 12C6 10 3 12 3 12s3 2 6.500 0M14.500 12c3.500-2 6.500 0 6.500 0s-3 2-6.500 0" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  moon: <path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z" />,
  drop: <path d="M12 3s6 6 6 11a6 6 0 0 1-12 0c0-5 6-11 6-11z" />,
  feather: <path d="M20 4C10 4 6 9 6 15v3M20 4c0 7-4 11-11 11M6 18l-2 2M9 12h5" />,
  bolt: <path d="M13 3L5 13h6l-1 8 8-10h-6z" />,
  mountain: <path d="M2 19l7-12 4 7 3-4 6 9z" />,
  wave: <path d="M2 9c3-3 5 3 8 0s5 3 8 0M2 15c3-3 5 3 8 0s5 3 8 0" />,
  cushion: (
    <>
      <path d="M5 6c4 1 10 1 14 0 1 4 1 8 0 12-4-1-10-1-14 0-1-4-1-8 0-12z" />
    </>
  ),
  yogablock: <path d="M4 9l3-3h13v8l-3 3H4zM4 9h13v8M17 9l3-3" />,
  rope: <path d="M4 20c0-8 4-8 4-12a3 3 0 0 1 6 0M20 20c0-8-4-8-4-12M6 20h-3M21 20h-3" />,
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
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {content ?? <circle cx="12" cy="12" r="2.5" fill="currentColor" />}
    </svg>
  )
}
