import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DonutChart, type ChartBucket } from '../components/DonutChart'

interface MetricCandidate {
  major: string | null
  grad_quarter: string | null
  grad_year: number | null
}

function gradLabel(c: MetricCandidate): string {
  if (!c.grad_quarter && !c.grad_year) return 'Not set'
  return [c.grad_quarter, c.grad_year].filter(Boolean).join(' ')
}

// Calendar order within a labeled year, e.g. Winter 2027 < Spring 2027 < Summer 2027 < Fall 2027 < Winter 2028.
const CALENDAR_QUARTER_ORDER: Record<string, number> = { Winter: 0, Spring: 1, Summer: 2, Fall: 3 }

function gradSortKey(label: string): number {
  if (label === 'Not set' || label === 'Other') return Number.MAX_SAFE_INTEGER
  const [quarter, year] = label.split(' ')
  const quarterRank = CALENDAR_QUARTER_ORDER[quarter] ?? 4
  return parseInt(year, 10) * 10 + quarterRank
}

function buildBuckets(labels: string[]): ChartBucket[] {
  const counts = new Map<string, number>()
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1)
  return Array.from(counts.entries()).map(([label, count]) => ({ label, count }))
}

/**
 * Keeps a pie chart readable: at most `maxSlices` real categories, with the
 * rest folded into "Other". "Not set" is kept separate from the fold since
 * it's meaningful on its own (how many are missing data), not noise.
 */
function foldBuckets(buckets: ChartBucket[], maxSlices = 6): ChartBucket[] {
  const notSet = buckets.find((b) => b.label === 'Not set')
  const real = buckets.filter((b) => b.label !== 'Not set').sort((a, b) => b.count - a.count)
  if (real.length <= maxSlices) return notSet ? [...real, notSet] : real
  const top = real.slice(0, maxSlices)
  const otherCount = real.slice(maxSlices).reduce((s, b) => s + b.count, 0)
  const folded: ChartBucket[] = [...top, { label: 'Other', count: otherCount }]
  return notSet ? [...folded, notSet] : folded
}

export function MetricsView() {
  const [candidates, setCandidates] = useState<MetricCandidate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('candidates')
      .select('major, grad_quarter, grad_year')
      .eq('is_rush_candidate', true)
      .then(({ data }) => {
        if (cancelled) return
        setCandidates(data ?? [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const gradBuckets = useMemo(() => {
    const folded = foldBuckets(buildBuckets(candidates.map(gradLabel)))
    return folded.sort((a, b) => gradSortKey(a.label) - gradSortKey(b.label))
  }, [candidates])
  const majorBuckets = useMemo(
    () => foldBuckets(buildBuckets(candidates.map((c) => c.major ?? 'Not set'))),
    [candidates],
  )
  const total = candidates.length

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="pt-[env(safe-area-inset-top)]">
        <h1 className="text-xl font-bold text-zinc-900">Metrics</h1>
        <p className="text-xs text-zinc-500 mb-4">Candidates</p>
      </div>

      <div className="rounded-lg bg-white border border-zinc-200 p-4 mb-5">
        <p className="text-2xl font-bold text-zinc-900">{total}</p>
        <p className="text-xs text-zinc-500 mt-0.5"># of PNMs</p>
      </div>

      {loading ? (
        <p className="text-center text-zinc-400 py-12">Loading…</p>
      ) : total === 0 ? (
        <p className="text-center text-zinc-400 py-12">No candidates yet.</p>
      ) : (
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-sm font-semibold text-zinc-700 mb-3">By Grad Date</h2>
            <DonutChart buckets={gradBuckets} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-700 mb-3">By Major</h2>
            <DonutChart buckets={majorBuckets} />
          </div>
        </div>
      )}
    </div>
  )
}
