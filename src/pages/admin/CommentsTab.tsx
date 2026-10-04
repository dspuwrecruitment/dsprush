import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { SENTIMENT_COLORS, SENTIMENTS, type CommentWithRelations, type Sentiment } from '../../lib/types'
import { copyCommentsForSheets, downloadCommentsCsv } from '../../lib/commentExport'

const SENTIMENT_RANK: Record<Sentiment, number> = {
  very_positive: 0,
  slightly_positive: 1,
  neutral: 2,
  slightly_negative: 3,
  very_negative: 4,
}

export function CommentsTab() {
  const [comments, setComments] = useState<CommentWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [exportStatus, setExportStatus] = useState('')

  function load() {
    supabase
      .from('comments')
      .select('*, candidates(id, first_name, last_name), submitters(id, name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setComments((data as CommentWithRelations[]) ?? [])
        setLoading(false)
      })
  }

  useEffect(() => {
    load()
  }, [])

  async function deleteComment(id: string) {
    setDeletingId(id)
    const { error } = await supabase.from('comments').delete().eq('id', id)
    setDeletingId(null)
    setConfirmingId(null)
    if (!error) setComments((prev) => prev.filter((c) => c.id !== id))
  }

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

  const groups = useMemo(() => {
    const byCandidate = new Map<
      string,
      { candidate: CommentWithRelations['candidates']; comments: CommentWithRelations[] }
    >()
    for (const c of filtered) {
      const key = c.candidates?.id ?? `unknown:${c.candidate_id}`
      if (!byCandidate.has(key)) byCandidate.set(key, { candidate: c.candidates, comments: [] })
      byCandidate.get(key)!.comments.push(c)
    }
    const list = Array.from(byCandidate.values())
    for (const g of list) {
      g.comments.sort((a, b) => SENTIMENT_RANK[a.sentiment] - SENTIMENT_RANK[b.sentiment])
    }
    list.sort((a, b) => {
      if (b.comments.length !== a.comments.length) return b.comments.length - a.comments.length
      const an = a.candidate ? `${a.candidate.first_name} ${a.candidate.last_name}` : ''
      const bn = b.candidate ? `${b.candidate.first_name} ${b.candidate.last_name}` : ''
      return an.localeCompare(bn)
    })
    return list
  }, [filtered])

  const sentimentLabel = (v: string) => SENTIMENTS.find((s) => s.value === v)?.label ?? v

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">All Comments ({comments.length})</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setExportStatus('Copying…')
              try {
                const n = await copyCommentsForSheets()
                setExportStatus(`Copied ${n} comments. Paste into a new Google Sheet (Cmd/Ctrl+V).`)
              } catch (e) {
                setExportStatus(`Copy failed: ${(e as Error).message}`)
              }
            }}
            className="px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Copy for Google Sheets
          </button>
          <button
            onClick={async () => {
              setExportStatus('Preparing CSV…')
              try {
                const n = await downloadCommentsCsv()
                setExportStatus(`Downloaded ${n} comments as CSV. Import it in Google Sheets via File → Import.`)
              } catch (e) {
                setExportStatus(`Download failed: ${(e as Error).message}`)
              }
            }}
            className="px-3 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Download CSV
          </button>
        </div>
      </div>
      {exportStatus && <p className="text-sm text-zinc-500 -mt-2 mb-4">{exportStatus}</p>}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by candidate, submitter, or text…"
        className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm mb-4 outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => {
            const key = g.candidate?.id ?? g.comments[0]?.candidate_id
            return (
              <div key={key}>
                <div className="flex items-baseline gap-2 mb-1.5">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {g.candidate ? `${g.candidate.first_name} ${g.candidate.last_name}` : 'Unknown candidate'}
                  </h3>
                  <span className="text-xs text-zinc-400">
                    {g.comments.length} comment{g.comments.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {g.comments.map((c) => {
                    const colors = SENTIMENT_COLORS[c.sentiment]
                    return (
                      <div key={c.id} className="bg-white border border-zinc-200 rounded-lg px-4 py-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full text-white ${colors.bg}`}>
                              {sentimentLabel(c.sentiment)}
                            </span>
                            {c.knows_outside_rush && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700">
                                Knows outside rush
                              </span>
                            )}
                            {c.was_coffee_chat && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-800">
                                Coffee chat
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-zinc-400">
                              {c.submitters?.name ?? 'Unknown'} · {new Date(c.created_at).toLocaleString()}
                            </span>
                            {confirmingId !== c.id && (
                              <button
                                onClick={() => setConfirmingId(c.id)}
                                className="text-xs font-medium text-red-500 hover:text-red-600"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                        {c.comment_text && <p className="text-sm text-zinc-600 mt-1.5">{c.comment_text}</p>}
                        {confirmingId === c.id && (
                          <div className="mt-2.5 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                            <span className="text-sm text-red-800">
                              Permanently delete this comment
                              {c.candidates ? ` on ${c.candidates.first_name} ${c.candidates.last_name}` : ''}?
                            </span>
                            <button
                              onClick={() => deleteComment(c.id)}
                              disabled={deletingId === c.id}
                              className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-md px-3 py-1"
                            >
                              {deletingId === c.id ? 'Deleting…' : 'Yes, delete'}
                            </button>
                            <button
                              onClick={() => setConfirmingId(null)}
                              className="text-sm font-medium text-zinc-600 hover:text-zinc-800"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {groups.length === 0 && <p className="text-sm text-zinc-400">No comments found.</p>}
        </div>
      )}
    </div>
  )
}
