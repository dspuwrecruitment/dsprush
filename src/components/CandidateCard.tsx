import { photoSrc } from '../lib/photo'
import type { Candidate } from '../lib/types'

interface CandidateCardProps {
  candidate: Candidate
  onClick: () => void
}

export function CandidateCard({ candidate, onClick }: CandidateCardProps) {
  const src = photoSrc(candidate.photo_url)

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-zinc-100 shadow-sm active:scale-95 active:bg-zinc-50 transition-all text-left"
    >
      <div className="w-16 h-16 rounded-full bg-zinc-100 overflow-hidden flex items-center justify-center shrink-0 ring-1 ring-zinc-100">
        {src ? (
          <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <span className="text-zinc-400 text-lg font-semibold">
            {candidate.first_name[0]}
            {candidate.last_name[0]}
          </span>
        )}
      </div>
      <span className="text-sm font-medium text-zinc-800 text-center leading-tight line-clamp-2">
        {candidate.first_name} {candidate.last_name}
      </span>
    </button>
  )
}
