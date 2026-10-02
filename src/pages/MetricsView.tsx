import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CandidateList } from '../lib/types'
import { CANDIDATE_LISTS } from '../lib/types'

interface MetricCandidate {
  major: string | null
  grad_quarter: string | null
  grad_year: number | null
}

interface Bucket {
  label: string
  count: number
}

function gradLabel(c: MetricCandidate): string {
  if (!c.grad_quarter && !c.grad_year) return 'Not set'
  return [c.grad_quarter, c.grad_year].filter(Boolean).join(' ')
}

// Calendar order within a labeled year, e.g. Winter 2027 < Spring 2027 < Summer 2027 < Fall 2027 < Winter 2028.
const CALENDAR_QUARTER_ORDER: Record<string, number> = { Winter: 0, Spring: 1, Summer: 2, Fall: 3 }

function gradSortKey(label: string): number {
  if (label === 'Not set') return Number.MAX_SAFE_INTEGER
  const [quarter, year] = label.split(' ')
  const quarterRank = CALENDAR_QUARTER_ORDER[quarter] ?? 4
  return parseInt(year, 10) * 10 + quarterRank
}

function buildBuckets(labels: string[]): Bucket[] {
  const counts = new Map<string, number>()
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1)
  return Array.from(counts.entries()).map(([label, count]) => ({ label, count }))
}

export function MetricsView({ listKey }: { listKey: CandidateList }) {
  const list = CANDIDATE_LISTS.find((l) => l.key === listKey)!
  const [candidates, setCandidates] = useState<MetricCandidate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('candidates')
      .select('major, grad_quarter, grad_year')
      .eq(list.column, true)
      .then(({ data }) => {
        if (cancelled) return
        setCandidates(data ?? [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [listKey, list.column])

  const gradBuckets = useMemo(
    () => buildBuckets(candidates.map(gradLabel)).sort((a, b) => gradSortKey(a.label) - gradSortKey(b.label)),
    [candidates],
  )
  const majorBuckets = useMemo(
    () =>
      buildBuckets(candidates.map((c) => c.major ?? 'Not set')).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    [candidates],
  )
  const total = candidates.length

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="pt-[env(safe-area-inset-top)]">
        <h1 className="text-xl font-bold text-zinc-900">Metrics</h1>
        <p className="text-xs text-zinc-500 mb-4">{list.label}</p>
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
        <div className="flex flex-col gap-6">
          <BreakdownSection title="By Grad Date" buckets={gradBuckets} total={total} />
          <BreakdownSection title="By Major" buckets={majorBuckets} total={total} />
        </div>
      )}
    </div>
  )
}

function BreakdownSection({ title, buckets, total }: { title: string; buckets: Bucket[]; total: number }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-700 mb-2">{title}</h2>
      <div className="rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100 overflow-hidden">
        {buckets.map((b) => {
          const pct = total > 0 ? Math.round((b.count / total) * 100) : 0
          return (
            <div key={b.label} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className={`text-sm font-medium ${b.label === 'Not set' ? 'text-zinc-400' : 'text-zinc-800'}`}>
                  {b.label}
                </span>
                <span className="text-xs font-semibold text-zinc-500 shrink-0">
                  {b.count} · {pct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
