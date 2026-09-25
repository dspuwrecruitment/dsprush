import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { buildSummaryItems, fetchActiveMembers } from '../../lib/rc'
import type { RcMember } from '../../lib/types'
import { ReviewModal, ScoreSelect, type RcAssignment } from './ReviewModal'

const MEMBER_KEY = 'dsprush_rc_member_id'

function readStoredMember(): string {
  try {
    return localStorage.getItem(MEMBER_KEY) ?? ''
  } catch {
    return ''
  }
}

export function RcApp() {
  const [members, setMembers] = useState<RcMember[] | null>(null)
  const [memberId, setMemberId] = useState(readStoredMember)
  const [pendingId, setPendingId] = useState('')
  const [assignments, setAssignments] = useState<RcAssignment[]>([])
  const [loading, setLoading] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchActiveMembers().then(setMembers)
  }, [])

  const validMemberId = members?.some((m) => m.id === memberId) ? memberId : ''

  useEffect(() => {
    if (!validMemberId) return
    let cancelled = false
    setLoading(true)
    supabase
      .from('review_assignments')
      .select('id, score, candidates(id, number, major, grad_year, grad_quarter, summary, answers, video_url)')
      .eq('rc_member_id', validMemberId)
      .then(({ data, error: loadError }) => {
        if (cancelled) return
        if (loadError) setError(loadError.message)
        const rows = ((data ?? []) as unknown as RcAssignment[]).filter((a) => a.candidates)
        rows.sort((a, b) => (a.candidates.number ?? 0) - (b.candidates.number ?? 0))
        setAssignments(rows)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [validMemberId])

  function chooseMember(id: string) {
    try {
      localStorage.setItem(MEMBER_KEY, id)
    } catch {
      // storage unavailable, selection just won't persist
    }
    setMemberId(id)
    setOpenId(null)
  }

  async function setScore(assignmentId: string, score: number | null) {
    setError('')
    const previous = assignments.find((a) => a.id === assignmentId)?.score ?? null
    setAssignments((prev) => prev.map((a) => (a.id === assignmentId ? { ...a, score } : a)))
    const { error: updateError } = await supabase
      .from('review_assignments')
      .update({ score, scored_at: score === null ? null : new Date().toISOString() })
      .eq('id', assignmentId)
    if (updateError) {
      setError('Could not save that score. Try again.')
      setAssignments((prev) => prev.map((a) => (a.id === assignmentId ? { ...a, score: previous } : a)))
    }
  }

  const scoredCount = useMemo(() => assignments.filter((a) => a.score !== null).length, [assignments])
  const open = assignments.find((a) => a.id === openId) ?? null

  if (members === null) {
    return <div className="min-h-screen flex items-center justify-center text-zinc-400">Loading…</div>
  }

  if (!validMemberId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 px-6 safe-top safe-bottom">
        <div className="w-full max-w-sm flex flex-col gap-6">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-1">Delta Sigma Pi</p>
            <h1 className="text-2xl font-bold text-white">Recruitment Committee</h1>
            <p className="text-sm text-zinc-400 mt-1">Select your name to see your applications</p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col gap-4">
            {members.length === 0 ? (
              <p className="text-sm text-zinc-600">No RC members have been added yet. Ask the SVP to add them.</p>
            ) : (
              <>
                <select
                  value={pendingId}
                  onChange={(e) => setPendingId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-base text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                >
                  <option value="">Select your name</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => pendingId && chooseMember(pendingId)}
                  disabled={!pendingId}
                  className="w-full rounded-lg bg-indigo-600 py-2.5 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  Continue
                </button>
              </>
            )}
            <Link to="/" className="text-center text-sm text-zinc-500 hover:text-zinc-700">
              Switch role
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-20 bg-zinc-50 border-b border-zinc-200 px-6 pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 py-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Recruitment Committee</h1>
            <Link to="/" className="text-sm font-medium text-zinc-500 hover:text-zinc-700">
              Switch role
            </Link>
          </div>
          <select
            value={validMemberId}
            onChange={(e) => chooseMember(e.target.value)}
            aria-label="Reviewer"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base font-medium text-zinc-800 outline-none focus:ring-2 focus:ring-indigo-600"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 pb-16">
        <p className="text-base text-zinc-500 mb-4">
          {scoredCount} of {assignments.length} scored
        </p>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {loading && <p className="text-center text-zinc-400 py-12">Loading applications…</p>}
        {!loading && assignments.length === 0 && (
          <p className="text-center text-zinc-400 py-12">No applications are assigned to this reviewer.</p>
        )}

        <div className="flex flex-col gap-2">
          {assignments.map((a) => {
            const items = buildSummaryItems({
              major: a.candidates.major,
              grad_year: a.candidates.grad_year,
              grad_quarter: a.candidates.grad_quarter,
              summary: a.candidates.summary ?? [],
            })
            const scored = a.score !== null
            return (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                onClick={() => setOpenId(a.id)}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) setOpenId(a.id)
                }}
                className={`flex items-center gap-5 rounded-lg border px-5 py-3.5 cursor-pointer transition-colors ${
                  scored
                    ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
                    : 'border-zinc-200 bg-white hover:bg-zinc-50'
                }`}
              >
                <p className="w-40 shrink-0 text-base font-semibold text-zinc-900">
                  Application #{a.candidates.number ?? '-'}
                </p>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-x-5 gap-y-0.5 text-[15px] text-zinc-600">
                    {items.length === 0 && <span>No summary</span>}
                    {items.map((i, idx) => (
                      <span key={idx}>
                        {i.label}: {i.value}
                      </span>
                    ))}
                  </div>
                </div>
                {scored && <span className="text-xs font-medium text-emerald-700">Scored</span>}
                <ScoreSelect value={a.score} onChange={(score) => setScore(a.id, score)} />
              </div>
            )
          })}
        </div>
      </main>

      {open && (
        <ReviewModal
          key={open.id}
          assignment={open}
          onScore={(score) => setScore(open.id, score)}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  )
}
