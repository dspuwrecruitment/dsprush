import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { SENTIMENT_COLORS, SENTIMENTS, type CommentWithRelations } from '../../lib/types'

export function CommentsTab() {
  const [comments, setComments] = useState<CommentWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    supabase
      .from('comments')
      .select('*, candidates(id, first_name, last_name), submitters(id, name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setComments((data as CommentWithRelations[]) ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return comments
    return comments.filter((c) => {
      const candidateName = c.candidates ? `${c.candidates.first_name} ${c.candidates.last_name}` : ''
      const submitterName = c.submitters?.name ?? ''
      return (
        candidateName.toLowerCase().includes(q) ||
        submitterName.toLowerCase().includes(q) ||
        c.comment_text.toLowerCase().includes(q)
      )
    })
  }, [comments, query])

  const sentimentLabel = (v: string) => SENTIMENTS.find((s) => s.value === v)?.label ?? v

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">All Comments ({comments.length})</h2>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by candidate, submitter, or text…"
        className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm mb-4 outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => {
            const colors = SENTIMENT_COLORS[c.sentiment]
            return (
              <div key={c.id} className="bg-white border border-zinc-100 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-zinc-800 text-sm">
                      {c.candidates ? `${c.candidates.first_name} ${c.candidates.last_name}` : 'Unknown candidate'}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full text-white ${colors.bg}`}>
                      {sentimentLabel(c.sentiment)}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {c.submitters?.name ?? 'Unknown'} · {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                {c.comment_text && <p className="text-sm text-zinc-600 mt-1.5">{c.comment_text}</p>}
              </div>
            )
          })}
          {filtered.length === 0 && <p className="text-sm text-zinc-400">No comments found.</p>}
        </div>
      )}
    </div>
  )
}
