import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Submitter } from '../lib/types'

interface Row {
  submitter: Submitter
  count: number
}

export function LeaderboardView({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<Row[]>([])
  const [totalComments, setTotalComments] = useState(0)
  const [candidatesCovered, setCandidatesCovered] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const [{ data: submitters }, { data: comments }] = await Promise.all([
        supabase.from('submitters').select('*').order('name'),
        supabase.from('comments').select('submitter_id, candidate_id'),
      ])
      if (cancelled) return

      const counts = new Map<string, number>()
      const candidateSet = new Set<string>()
      for (const c of comments ?? []) {
        counts.set(c.submitter_id, (counts.get(c.submitter_id) ?? 0) + 1)
        candidateSet.add(c.candidate_id)
      }

      const built: Row[] = (submitters ?? [])
        .map((s) => ({ submitter: s, count: counts.get(s.id) ?? 0 }))
        .sort((a, b) => b.count - a.count)

      setRows(built)
      setTotalComments(comments?.length ?? 0)
      setCandidatesCovered(candidateSet.size)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="pt-[env(safe-area-inset-top)]">
        <h1 className="text-2xl font-bold text-zinc-900 mb-4">Leaderboard</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-4">
          <p className="text-2xl font-bold text-indigo-600">{totalComments}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Total comments</p>
        </div>
        <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-4">
          <p className="text-2xl font-bold text-indigo-600">{candidatesCovered}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Candidates covered</p>
        </div>
      </div>

      {loading && <p className="text-center text-zinc-400 py-12">Loading…</p>}

      <div className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <div
            key={r.submitter.id}
            className="flex items-center gap-3 bg-white border border-zinc-100 rounded-2xl shadow-sm px-4 py-3"
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                i === 0
                  ? 'bg-amber-400 text-white'
                  : i === 1
                    ? 'bg-zinc-300 text-white'
                    : i === 2
                      ? 'bg-orange-300 text-white'
                      : 'bg-zinc-100 text-zinc-500'
              }`}
            >
              {i + 1}
            </span>
            <span className="flex-1 font-medium text-zinc-800">{r.submitter.name}</span>
            <span className="text-sm font-semibold text-zinc-500">{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
