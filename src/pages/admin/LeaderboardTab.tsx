import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { buildSummaryItems, CUT_LINE_LIMIT, REVIEWERS_PER_CANDIDATE, safeHttpUrl } from '../../lib/rc'
import { ChevronDownIcon, DotsIcon, GripIcon } from '../../components/icons'
import type { Candidate, RankingState } from '../../lib/types'

interface LbReviewer {
  id: string
  name: string
  removed_at: string | null
}

interface LbAssignment {
  id: string
  score: number | null
  rc_members: LbReviewer | null
}

type LbCandidate = Candidate & { review_assignments: LbAssignment[] }

function scoresOf(c: LbCandidate): number[] {
  return c.review_assignments.map((a) => a.score).filter((s): s is number => s !== null)
}

function average(c: LbCandidate): number | null {
  const scores = scoresOf(c)
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
}

export function LeaderboardTab() {
  const [candidates, setCandidates] = useState<LbCandidate[]>([])
  const [state, setState] = useState<RankingState | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [menuId, setMenuId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [{ data: cands, error: candError }, { data: st }] = await Promise.all([
      supabase.from('candidates').select('*, review_assignments(id, score, rc_members(id, name, removed_at))'),
      supabase.from('ranking_state').select('*').eq('id', 1).single(),
    ])
    if (candError) setError(candError.message)
    setCandidates((cands ?? []) as unknown as LbCandidate[])
    setState(st as RankingState | null)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const locked = !!state?.locked_at
  const cut = state?.cut_size ?? 0

  const ordered = useMemo(() => {
    const list = [...candidates]
    if (locked) {
      list.sort((a, b) => (a.rank_order ?? Number.MAX_SAFE_INTEGER) - (b.rank_order ?? Number.MAX_SAFE_INTEGER))
    } else {
      list.sort((a, b) => {
        const av = average(a)
        const bv = average(b)
        if (av === bv) return (a.number ?? 0) - (b.number ?? 0)
        if (av === null) return 1
        if (bv === null) return -1
        return bv - av || (a.number ?? 0) - (b.number ?? 0)
      })
    }
    return list
  }, [candidates, locked])

  async function move(id: string, pos: number, above: boolean) {
    setBusy(true)
    setError('')
    setMenuId(null)
    const { error: rpcError } = await supabase.rpc('move_candidate', {
      p_candidate: id,
      p_new_pos: pos,
      p_above: above,
    })
    if (rpcError) setError(rpcError.message)
    await load()
    setBusy(false)
  }

  async function lockRanking() {
    const message = locked
      ? 'Re-lock the ranking?\n\nThis resets every manual move and rebuilds the order from current scores.'
      : 'Lock the ranking?\n\nThe order will be set from current average scores. After that, scores no longer reorder the list and you can move candidates around the cut line.'
    if (!confirm(message)) return
    setBusy(true)
    setError('')
    const { error: rpcError } = await supabase.rpc('lock_ranking', { p_limit: CUT_LINE_LIMIT })
    if (rpcError) setError(rpcError.message)
    await load()
    setBusy(false)
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function dropOnRow(target: LbCandidate) {
    const dragged = candidates.find((c) => c.id === dragId)
    setDragId(null)
    setOverId(null)
    if (!dragged || dragged.id === target.id || target.rank_order == null) return
    move(dragged.id, target.rank_order, target.rank_order <= cut)
  }

  function dropOnLine() {
    const dragged = candidates.find((c) => c.id === dragId)
    setDragId(null)
    setOverId(null)
    if (!dragged || dragged.rank_order == null) return
    if (dragged.rank_order <= cut) move(dragged.id, cut, false)
    else move(dragged.id, cut + 1, true)
  }

  if (loading) return <p className="text-sm text-zinc-400">Loading…</p>

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-6 px-6 pt-2 bg-zinc-50 border-b border-zinc-200">
        <div className="flex items-center justify-between gap-3 pb-2 flex-wrap">
          <div className="flex items-baseline gap-3">
            <h2 className="text-base font-semibold text-zinc-900">Leaderboard ({candidates.length})</h2>
            {!locked && (
              <span className="text-xs text-zinc-500">
                Live ranking by average score. Lock it to set the cut line at {CUT_LINE_LIMIT} and enable moves.
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {locked && (
              <p className="text-sm text-zinc-500">
                Above the line{' '}
                <span className={`text-base font-bold ${cut > CUT_LINE_LIMIT ? 'text-red-600' : 'text-zinc-900'}`}>
                  {cut}/{CUT_LINE_LIMIT}
                </span>
              </p>
            )}
            <button
              onClick={lockRanking}
              disabled={busy || candidates.length === 0}
              className={
                locked
                  ? 'text-sm font-medium text-zinc-500 hover:text-zinc-700 disabled:opacity-50'
                  : 'px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50'
              }
            >
              {locked ? 'Re-lock ranking' : 'Lock ranking'}
            </button>
          </div>
        </div>
        <div className={`${ROW_GRID} pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400`}>
          <span />
          <span className="text-right">Rank</span>
          <span>Name</span>
          <span>App</span>
          <span>Major</span>
          <span>Grad</span>
          <span className="text-right">Avg</span>
          <span className="text-center">Scored</span>
          <span />
          <span />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 my-2">{error}</p>}
      {candidates.length === 0 && <p className="text-sm text-zinc-400 mt-3">No candidates yet.</p>}

      {menuId && <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />}

      <div className="mt-2 mb-12 rounded-lg border border-zinc-200 bg-white">
        {ordered.map((c, i) => {
          const isAbove = locked && i < cut
          const greyed = locked && !isAbove && c.moved_down
          const avg = average(c)
          const scored = scoresOf(c).length
          const isOpen = expanded.has(c.id)
          return (
            <div key={c.id} className="contents">
              {locked && i === cut && (
                <CutLine
                  active={overId === 'line'}
                  onDragOver={() => dragId && setOverId('line')}
                  onDrop={dropOnLine}
                />
              )}
              <div
                data-row={c.id}
                onDragOver={(e) => {
                  if (!dragId) return
                  e.preventDefault()
                  setOverId(c.id)
                }}
                onDragLeave={() => setOverId((prev) => (prev === c.id ? null : prev))}
                onDrop={(e) => {
                  e.preventDefault()
                  dropOnRow(c)
                }}
                className={`border-b border-zinc-100 last:border-b-0 ${overId === c.id ? 'bg-indigo-50' : ''} ${
                  greyed ? 'opacity-60' : ''
                }`}
              >
                <div
                  draggable={locked && !busy}
                  onDragStart={(e) => {
                    setDragId(c.id)
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', c.id)
                  }}
                  onDragEnd={() => {
                    setDragId(null)
                    setOverId(null)
                  }}
                  className={`${ROW_GRID} text-[13px] leading-6 hover:bg-zinc-50`}
                >
                  {locked ? (
                    <GripIcon className="w-3.5 h-3.5 text-zinc-300 cursor-grab" />
                  ) : (
                    <span />
                  )}
                  <span className="text-right font-semibold text-zinc-400">
                    #{locked ? (c.score_rank ?? '-') : i + 1}
                  </span>
                  <button
                    onClick={() => toggleExpanded(c.id)}
                    className="text-left truncate font-medium text-zinc-900"
                    title={`${c.first_name} ${c.last_name}`}
                  >
                    {c.first_name} {c.last_name}
                  </button>
                  <span className="text-xs text-zinc-400">#{c.number ?? '-'}</span>
                  <span className="truncate text-zinc-600" title={c.major ?? ''}>
                    {c.major ?? '-'}
                  </span>
                  <span className="text-zinc-600">
                    {[c.grad_quarter, c.grad_year].filter(Boolean).join(' ') || '-'}
                  </span>
                  <span className="text-right font-semibold text-zinc-800">
                    {avg === null ? '-' : avg.toFixed(2)}
                  </span>
                  <span
                    className={`justify-self-center text-[11px] font-medium leading-4 px-1.5 rounded-full border ${
                      scored >= REVIEWERS_PER_CANDIDATE
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}
                  >
                    {scored}/{REVIEWERS_PER_CANDIDATE}
                  </span>
                  {locked ? (
                    <div className="relative">
                      <button
                        onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                        aria-label="Move options"
                        className="w-6 h-6 rounded-full text-zinc-500 flex items-center justify-center hover:bg-zinc-100 relative z-20"
                      >
                        <DotsIcon className="w-3.5 h-3.5" />
                      </button>
                      {menuId === c.id && (
                        <div className="absolute right-0 top-6 z-20 w-32 rounded-lg border border-zinc-200 bg-white shadow-lg py-1">
                          <button
                            onClick={() => (isAbove ? move(c.id, cut, false) : move(c.id, cut + 1, true))}
                            disabled={busy}
                            className="w-full text-left px-3 py-1.5 text-sm leading-5 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                          >
                            {isAbove ? 'Move Down' : 'Move Up'}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={() => toggleExpanded(c.id)}
                    aria-label={isOpen ? 'Collapse' : 'Expand'}
                    className="w-6 h-6 rounded-full text-zinc-500 flex items-center justify-center hover:bg-zinc-100"
                  >
                    <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {isOpen && <Detail candidate={c} />}
              </div>
            </div>
          )
        })}
        {locked && cut >= ordered.length && ordered.length > 0 && (
          <CutLine active={overId === 'line'} onDragOver={() => dragId && setOverId('line')} onDrop={dropOnLine} />
        )}
      </div>
    </div>
  )
}

const ROW_GRID =
  'grid items-center gap-x-2 px-2 grid-cols-[16px_48px_minmax(0,1.3fr)_44px_minmax(0,1fr)_92px_48px_52px_24px_24px]'

function CutLine({
  active,
  onDragOver,
  onDrop,
}: {
  active: boolean
  onDragOver: () => void
  onDrop: () => void
}) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver()
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDrop()
      }}
      className={`flex items-center gap-3 px-2 py-1 ${active ? 'text-indigo-600 bg-indigo-50' : 'text-red-500'}`}
    >
      <div className={`flex-1 border-t-2 border-dashed ${active ? 'border-indigo-500' : 'border-red-400'}`} />
      <span className="text-[10px] font-semibold uppercase tracking-wide">Cut line</span>
      <div className={`flex-1 border-t-2 border-dashed ${active ? 'border-indigo-500' : 'border-red-400'}`} />
    </div>
  )
}

function Detail({ candidate: c }: { candidate: LbCandidate }) {
  const summary = buildSummaryItems({
    major: c.major,
    grad_year: c.grad_year,
    grad_quarter: c.grad_quarter,
    summary: c.summary ?? [],
  })
  const video = safeHttpUrl(c.video_url)
  const assignments = c.review_assignments
  const unassigned = Math.max(REVIEWERS_PER_CANDIDATE - assignments.length, 0)

  return (
    <div className="border-t border-zinc-100 px-4 py-4 grid gap-5 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">Reviews</h3>
          <div className="flex flex-col gap-1.5">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-zinc-700">
                  {a.rc_members?.name ?? 'Unknown reviewer'}
                  {a.rc_members?.removed_at && <span className="text-zinc-400"> (removed)</span>}
                </span>
                {a.score === null ? (
                  <span className="text-xs font-medium text-amber-700">Not scored</span>
                ) : (
                  <span className="font-semibold text-zinc-900">{a.score}</span>
                )}
              </div>
            ))}
            {Array.from({ length: unassigned }).map((_, i) => (
              <div key={`u${i}`} className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">No reviewer assigned</span>
                <span className="text-xs font-medium text-red-600">Missing</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">Summary</h3>
          <div className="flex flex-col gap-1 text-sm">
            {c.email && (
              <p>
                <span className="text-zinc-500">Email: </span>
                {c.email}
              </p>
            )}
            {summary.map((s, i) => (
              <p key={i}>
                <span className="text-zinc-500">{s.label}: </span>
                {s.value}
              </p>
            ))}
            {video && (
              <a href={video} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium">
                Video
              </a>
            )}
          </div>
        </section>
      </div>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">Application answers</h3>
        <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
          {(c.answers ?? []).map((a, i) => (
            <div key={i}>
              <p className="text-xs font-medium text-zinc-500">{a.question}</p>
              <p className="text-sm text-zinc-800 whitespace-pre-wrap">{a.answer || 'No answer provided.'}</p>
            </div>
          ))}
          {(c.answers ?? []).length === 0 && <p className="text-sm text-zinc-400">No answers imported.</p>}
        </div>
      </section>
    </div>
  )
}
