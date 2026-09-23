import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Candidate } from '../lib/types'
import { CandidateCard } from '../components/CandidateCard'
import { CandidateModal } from '../components/CandidateModal'

export function SearchView({ onCommentSubmitted }: { onCommentSubmitted: () => void }) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Candidate | null>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('candidates')
      .select('*')
      .order('first_name')
    setCandidates(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter((c) =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q),
    )
  }, [candidates, query])

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
      <div className="sticky top-0 -mx-4 px-4 pt-[env(safe-area-inset-top)] pb-3 bg-zinc-50 border-b border-zinc-200 z-20">
        <h1 className="text-xl font-bold text-zinc-900 mb-3">DSP Rush</h1>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${candidates.length || ''} candidates…`}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-base text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
        />
      </div>

      {loading && <p className="text-center text-zinc-400 py-12">Loading candidates…</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-center text-zinc-400 py-12">No candidates found.</p>
      )}

      <div className="grid grid-cols-3 gap-3 mt-4">
        {filtered.map((c) => (
          <CandidateCard key={c.id} candidate={c} onClick={() => setSelected(c)} />
        ))}
      </div>

      {selected && (
        <CandidateModal
          candidate={selected}
          onClose={() => setSelected(null)}
          onSubmitted={onCommentSubmitted}
        />
      )}
    </div>
  )
}
