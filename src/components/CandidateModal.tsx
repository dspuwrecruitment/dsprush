import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { photoSrc } from '../lib/photo'
import type { Candidate, Sentiment, Submitter } from '../lib/types'
import { SentimentPicker } from './SentimentPicker'
import { CheckIcon, CloseIcon } from './icons'

interface CandidateModalProps {
  candidate: Candidate
  onClose: () => void
  onSubmitted: () => void
}

const LAST_SUBMITTER_KEY = 'dsprush_last_submitter_id'

export function CandidateModal({ candidate, onClose, onSubmitted }: CandidateModalProps) {
  const [mode, setMode] = useState<'view' | 'comment' | 'done'>('view')
  const [submitters, setSubmitters] = useState<Submitter[]>([])
  const [submitterId, setSubmitterId] = useState('')
  const [sentiment, setSentiment] = useState<Sentiment | null>(null)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const src = photoSrc(candidate.photo_url, 800)

  useEffect(() => {
    if (mode !== 'comment') return
    supabase
      .from('submitters')
      .select('*')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        setSubmitters(data ?? [])
        const last = localStorage.getItem(LAST_SUBMITTER_KEY)
        if (last && data?.some((s) => s.id === last)) {
          setSubmitterId(last)
        }
      })
  }, [mode])

  async function handleSubmit() {
    if (!sentiment || !submitterId) {
      setError('Select who you are and a sentiment before submitting.')
      return
    }
    setSubmitting(true)
    setError('')
    const { error: insertError } = await supabase.from('comments').insert({
      candidate_id: candidate.id,
      submitter_id: submitterId,
      sentiment,
      comment_text: text.trim(),
    })
    setSubmitting(false)
    if (insertError) {
      setError('Something went wrong. Try again.')
      return
    }
    localStorage.setItem(LAST_SUBMITTER_KEY, submitterId)
    onSubmitted()
    setMode('done')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
      <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl border border-zinc-200 shadow-lg max-h-[92vh] overflow-y-auto safe-bottom">
        <div className="sticky top-0 bg-white border-b border-zinc-100 flex justify-between items-center px-5 py-3 z-10">
          <span className="text-sm font-medium text-zinc-500">Candidate</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full text-zinc-500 flex items-center justify-center hover:bg-zinc-100 active:bg-zinc-200"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-5 pb-8 flex flex-col gap-5">
          {mode !== 'done' && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-28 h-28 rounded-full bg-zinc-100 overflow-hidden ring-1 ring-zinc-200 flex items-center justify-center">
                {src ? (
                  <img src={src} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-zinc-400 text-3xl font-semibold">
                    {candidate.first_name[0]}
                    {candidate.last_name[0]}
                  </span>
                )}
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-zinc-900">
                  {candidate.first_name} {candidate.last_name}
                </h2>
                <p className="text-sm text-zinc-500 mt-0.5">
                  {candidate.major || 'Major not set'}
                  {(candidate.grad_quarter || candidate.grad_year) && (
                    <>
                      {' · '}
                      {[candidate.grad_quarter, candidate.grad_year].filter(Boolean).join(' ')}
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {mode === 'view' && (
            <button
              onClick={() => setMode('comment')}
              className="w-full rounded-lg bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
            >
              Submit Comment
            </button>
          )}

          {mode === 'comment' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-zinc-700 mb-2 block">Sentiment</label>
                <SentimentPicker value={sentiment} onChange={setSentiment} />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-700 mb-2 block">Comment</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  placeholder="Share your thoughts..."
                  className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-base text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-700 mb-2 block">
                  Who is submitting this comment?
                </label>
                <select
                  value={submitterId}
                  onChange={(e) => setSubmitterId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-base text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                >
                  <option value="">Select your name</option>
                  {submitters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full rounded-lg bg-indigo-600 py-3 text-white font-medium hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 transition-colors"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          )}

          {mode === 'done' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center ring-1 ring-emerald-200">
                <CheckIcon className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">Comment submitted</h2>
              <p className="text-sm text-zinc-500">
                Thanks for weighing in on {candidate.first_name}.
              </p>
              <button
                onClick={onClose}
                className="mt-2 w-full rounded-lg bg-zinc-900 py-2.5 text-white font-medium hover:bg-zinc-800 active:bg-zinc-700 transition-colors"
              >
                Back to search
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
