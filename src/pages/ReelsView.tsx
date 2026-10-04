import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { photoSrc } from '../lib/photo'
import { CANDIDATE_LISTS, type Candidate, type CandidateList } from '../lib/types'
import { CandidateModal } from '../components/CandidateModal'
import { CommentIcon } from '../components/icons'

interface ReelsViewProps {
  listKey: CandidateList
  onCommentSubmitted: () => void
}

export function ReelsView({ listKey, onCommentSubmitted }: ReelsViewProps) {
  const list = CANDIDATE_LISTS.find((l) => l.key === listKey)!
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Candidate | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('candidates')
      .select('*')
      .eq(list.column, true)
      .order('first_name')
      .then(({ data }) => {
        if (cancelled) return
        setCandidates(data ?? [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [listKey, list.column])

  if (loading) return <p className="text-center text-zinc-400 py-12">Loading…</p>
  if (candidates.length === 0) return <p className="text-center text-zinc-400 py-12">No candidates yet.</p>

  return (
    <>
      <div className="h-[calc(100dvh-60px)] overflow-y-auto snap-y snap-mandatory bg-zinc-900">
        <div className="mx-auto h-full max-w-lg relative">
        {candidates.map((c) => (
          <ReelCard key={c.id} candidate={c} onComment={() => setSelected(c)} />
        ))}
        </div>
      </div>

      {selected && (
        <CandidateModal
          candidate={selected}
          onClose={() => setSelected(null)}
          onSubmitted={onCommentSubmitted}
          startInCommentMode
          fullScreen
        />
      )}
    </>
  )
}

function ReelCard({ candidate, onComment }: { candidate: Candidate; onComment: () => void }) {
  const src = photoSrc(candidate.photo_url, 800)
  const [imgFailed, setImgFailed] = useState(false)
  const grad = [candidate.grad_quarter, candidate.grad_year].filter(Boolean).join(' ')

  return (
    <section className="relative h-full w-full snap-start snap-always flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center p-6">
        {src && !imgFailed ? (
          <img
            src={src}
            alt=""
            onError={() => setImgFailed(true)}
            className="max-h-[70%] max-w-full rounded-2xl object-contain"
          />
        ) : (
          <div className="w-44 h-44 rounded-full bg-zinc-800 flex items-center justify-center text-5xl font-semibold text-zinc-400">
            {candidate.first_name[0]}
            {candidate.last_name[0]}
          </div>
        )}
      </div>

      <div className="absolute left-0 right-16 bottom-0 p-5 text-white">
        <p className="text-2xl font-bold leading-tight">
          {candidate.first_name} {candidate.last_name}
        </p>
        <p className="text-sm text-zinc-300 mt-1">
          {candidate.major || 'Major not set'}
          {grad && ` · ${grad}`}
        </p>
      </div>

      <div className="absolute right-3 bottom-8 flex flex-col items-center gap-1">
        <button
          onClick={onComment}
          aria-label={`Comment on ${candidate.first_name} ${candidate.last_name}`}
          className="w-12 h-12 rounded-full bg-white/15 backdrop-blur text-white flex items-center justify-center active:bg-white/30 p-3.5"
        >
          <CommentIcon className="w-6 h-6" />
        </button>
        <span className="text-xs font-medium text-white">Comment</span>
      </div>
    </section>
  )
}
