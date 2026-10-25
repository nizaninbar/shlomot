/** YYYY-MM-DD -> DD.MM.YYYY */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}
