const KEY = 'shlomot.fontSize'

/** Root font size in px per level; every size in the CSS is rem-based, so the whole UI scales together. */
export const FONT_SIZES = { normal: 17, large: 20, xlarge: 23 } as const
export type FontSizeLevel = keyof typeof FONT_SIZES

export function getFontSize(): FontSizeLevel {
  const saved = localStorage.getItem(KEY)
  return saved && saved in FONT_SIZES ? (saved as FontSizeLevel) : 'normal'
}

export function applyFontSize(level: FontSizeLevel = getFontSize()) {
  document.documentElement.style.setProperty('--root-size', `${FONT_SIZES[level]}px`)
}

export function setFontSize(level: FontSizeLevel) {
  localStorage.setItem(KEY, level)
  applyFontSize(level)
}
