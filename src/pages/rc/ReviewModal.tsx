import { useEffect, useMemo, useState } from 'react'
import { ChevronLeftIcon, CloseIcon } from '../../components/icons'
import { buildSummaryItems, safeHttpUrl } from '../../lib/rc'
import type { AnswerItem, SummaryItem } from '../../lib/types'

export interface RcCandidate {
  id: string
  number: number | null
  major: string | null
  grad_year: number | null
  grad_quarter: string | null
  summary: SummaryItem[] | null
  answers: AnswerItem[] | null
  video_url: string | null
}

export interface RcAssignment {
  id: string
  score: number | null
  candidates: RcCandidate
}

type Screen = { kind: 'summary' } | { kind: 'answer'; item: AnswerItem; index: number } | { kind: 'video'; url: string }

export function ScoreSelect({
  value,
  onChange,
  className = '',
}: {
  value: number | null
  onChange: (score: number | null) => void
  className?: string
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
      onClick={(e) => e.stopPropagation()}
      aria-label="Score"
      className={`rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base font-medium text-zinc-800 outline-none focus:ring-2 focus:ring-indigo-600 ${className}`}
    >
      <option value="">Score</option>
      {[1, 2, 3, 4, 5].map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  )
}

export function ReviewModal({
  assignment,
  onScore,
  onClose,
}: {
  assignment: RcAssignment
  onScore: (score: number | null) => void
  onClose: () => void
}) {
  const c = assignment.candidates
  const screens = useMemo<Screen[]>(() => {
    const list: Screen[] = [{ kind: 'summary' }]
    ;(c.answers ?? []).forEach((item, index) => list.push({ kind: 'answer', item, index }))
    const url = safeHttpUrl(c.video_url)
    if (url) list.push({ kind: 'video', url })
    return list
  }, [c.answers, c.video_url])

  const [step, setStep] = useState(0)
  const last = screens.length - 1
  const screen = screens[step]
  const answerCount = (c.answers ?? []).length

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLSelectElement) return
      if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, last))
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0))
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last, onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-6 md:px-10 py-4 safe-top">
        <div>
          <p className="text-lg font-semibold text-zinc-900">Application #{c.number ?? '-'}</p>
          <p className="text-sm text-zinc-500">
            Screen {step + 1} of {screens.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ScoreSelect value={assignment.score} onChange={onScore} />
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full text-zinc-500 flex items-center justify-center hover:bg-zinc-100 active:bg-zinc-200"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10 md:py-14">
          {screen.kind === 'summary' && (
            <div className="flex flex-col gap-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Summary</h2>
              {buildSummaryItems({
                major: c.major,
                grad_year: c.grad_year,
                grad_quarter: c.grad_quarter,
                summary: c.summary ?? [],
              }).map((item, i) => (
                <div key={i}>
                  <p className="text-xs font-medium text-zinc-500">{item.label}</p>
                  <p className="text-xl text-zinc-900 whitespace-pre-wrap">{item.value}</p>
                </div>
              ))}
              {answerCount === 0 && !safeHttpUrl(c.video_url) && (
                <p className="text-sm text-zinc-500">No application answers were imported.</p>
              )}
            </div>
          )}

          {screen.kind === 'answer' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Question {screen.index + 1} of {answerCount}
              </h2>
              <p className="text-2xl font-semibold text-zinc-900 whitespace-pre-wrap">{screen.item.question}</p>
              {screen.item.answer.trim() ? (
                <p className="text-xl leading-relaxed text-zinc-800 whitespace-pre-wrap">{screen.item.answer}</p>
              ) : (
                <p className="text-xl text-zinc-400">No answer provided.</p>
              )}
            </div>
          )}

          {screen.kind === 'video' && (
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Video</h2>
              <a
                href={screen.url}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start rounded-lg bg-indigo-600 px-5 py-3 text-base font-medium text-white hover:bg-indigo-700"
              >
                Click here for video
              </a>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-200 px-6 py-4 safe-bottom">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0}
            aria-label="Previous screen"
            className="flex items-center gap-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-30"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={() => setStep((s) => Math.min(s + 1, last))}
            disabled={step === last}
            aria-label="Next screen"
            className="flex items-center gap-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-30"
          >
            Next
            <ChevronLeftIcon className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </footer>
    </div>
  )
}
