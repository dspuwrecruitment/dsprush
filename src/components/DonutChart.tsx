import { useState } from 'react'
import { assignColors } from '../lib/chartColors'

export interface ChartBucket {
  label: string
  count: number
}

interface DonutChartProps {
  buckets: ChartBucket[]
}

const SIZE = 200
const CENTER = SIZE / 2
const RADIUS = 76
const STROKE = 30
const HOVER_STROKE = 34
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 3 // visual separation between slices, in the same units as the circumference
const MIN_VISIBLE_LENGTH = 2.5 // a slice always gets at least this much stroke, so it stays visible and hoverable

export function DonutChart({ buckets }: DonutChartProps) {
  const [active, setActive] = useState<string | null>(null)
  const total = buckets.reduce((s, b) => s + b.count, 0)
  const colors = assignColors(buckets.map((b) => b.label))

  let cumulative = 0
  const slices = buckets.map((b) => {
    const fraction = total > 0 ? b.count / total : 0
    const startDeg = cumulative * 360 - 90
    cumulative += fraction
    const length = fraction > 0 ? Math.max(fraction * CIRCUMFERENCE - GAP, MIN_VISIBLE_LENGTH) : 0
    return { ...b, startDeg, length, pct: Math.round(fraction * 100), color: colors.get(b.label) ?? '#a3a298' }
  })

  const activeSlice = slices.find((s) => s.label === active) ?? null

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`${total} total, broken down by ${buckets.length} categories`}
        >
          {slices.map((s) => (
            <circle
              key={s.label}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={s.color}
              strokeWidth={active === s.label ? HOVER_STROKE : STROKE}
              strokeDasharray={`${s.length} ${CIRCUMFERENCE - s.length}`}
              strokeLinecap="butt"
              transform={`rotate(${s.startDeg} ${CENTER} ${CENTER})`}
              tabIndex={0}
              role="button"
              aria-label={`${s.label}: ${s.count} (${s.pct}%)`}
              className="cursor-pointer outline-none transition-[stroke-width] duration-150 focus-visible:opacity-80"
              onMouseEnter={() => setActive(s.label)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(s.label)}
              onBlur={() => setActive(null)}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-zinc-900">{activeSlice ? activeSlice.count : total}</span>
          <span className="text-xs text-zinc-500 text-center px-6 leading-tight">
            {activeSlice ? `${activeSlice.label} · ${activeSlice.pct}%` : 'Total'}
          </span>
        </div>
      </div>

      <div className="w-full flex flex-col divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white overflow-hidden">
        {slices.map((s) => (
          <button
            key={s.label}
            onMouseEnter={() => setActive(s.label)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(s.label)}
            onBlur={() => setActive(null)}
            onClick={() => setActive((prev) => (prev === s.label ? null : s.label))}
            className={`flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
              active === s.label ? 'bg-zinc-50' : ''
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className={`flex-1 text-sm truncate ${s.label === 'Not set' ? 'text-zinc-400' : 'text-zinc-800'}`}>
              {s.label}
            </span>
            <span className="text-xs font-semibold text-zinc-500 shrink-0">
              {s.count} · {s.pct}%
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
