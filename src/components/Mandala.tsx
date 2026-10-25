// Decorative lotus mandala drawn with thin gold lines; used as a faint background watermark.
const petals = Array.from({ length: 12 }, (_, i) => i * 30)
const inner = Array.from({ length: 8 }, (_, i) => i * 45 + 22.5)

export default function Mandala({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="-100 -100 200 200" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="0.6">
        <circle r="96" />
        <circle r="90" strokeDasharray="1 3" />
        {petals.map((a) => (
          <path key={a} transform={`rotate(${a})`} d="M0 -30 C 18 -50, 14 -72, 0 -86 C -14 -72, -18 -50, 0 -30 Z" />
        ))}
        {inner.map((a) => (
          <path key={a} transform={`rotate(${a})`} d="M0 -14 C 10 -26, 8 -40, 0 -50 C -8 -40, -10 -26, 0 -14 Z" />
        ))}
        <circle r="28" />
        <circle r="12" />
      </g>
    </svg>
  )
}
