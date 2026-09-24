import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Candidate } from '../../lib/types'
import { CsvImportModal } from './CsvImportModal'
import { CandidateFormModal } from './CandidateFormModal'

export function CandidatesTab() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Candidate | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('candidates').select('*').order('first_name')
    setCandidates(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter((c) => `${c.first_name} ${c.last_name}`.toLowerCase().includes(q))
  }, [candidates, query])

  useEffect(() => {
    setSelected((prev) => {
      const visibleIds = new Set(filtered.map((c) => c.id))
      const next = new Set(Array.from(prev).filter((id) => visibleIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [filtered])

  async function removeCandidate(c: Candidate) {
    if (
      !confirm(
        `Delete ${c.first_name} ${c.last_name}?\n\nThis removes their comments, pulls them from every reviewer's queue, and deletes any scores they received.`,
      )
    )
      return
    await supabase.from('candidates').delete().eq('id', c.id)
    load()
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id))))
  }

  async function deleteSelected() {
    const count = selected.size
    if (count === 0) return
    if (
      !confirm(
        `Delete ${count} candidate${count > 1 ? 's' : ''}?\n\nThis removes their comments, pulls them from every reviewer's queue, and deletes any scores they received.`,
      )
    )
      return
    setDeleting(true)
    await supabase.from('candidates').delete().in('id', Array.from(selected))
    setSelected(new Set())
    setDeleting(false)
    load()
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-zinc-900">Candidates ({candidates.length})</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditTarget(null)
              setShowForm(true)
            }}
            className="px-4 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-700 text-sm font-medium hover:bg-zinc-50"
          >
            Add candidate
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            Import CSV
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search candidates…"
          className="w-full max-w-sm rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
        />
        {selected.size > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5">
            <span className="text-sm text-red-700 font-medium">{selected.size} selected</span>
            <button
              onClick={deleteSelected}
              disabled={deleting}
              className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete selected'}
            </button>
            <button onClick={() => setSelected(new Set())} className="text-sm text-zinc-500 hover:text-zinc-700">
              Clear
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500">
                <th className="px-4 py-2.5 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all"
                    className="rounded border-zinc-300"
                  />
                </th>
                <th className="px-4 py-2.5 font-medium">#</th>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Major</th>
                <th className="px-4 py-2.5 font-medium">Grad</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <CandidateRow
                  key={c.id}
                  candidate={c}
                  checked={selected.has(c.id)}
                  onToggle={() => toggleSelected(c.id)}
                  onEdit={() => {
                    setEditTarget(c)
                    setShowForm(true)
                  }}
                  onDelete={() => removeCandidate(c)}
                />
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-sm text-zinc-400 px-4 py-6">No candidates found.</p>}
        </div>
      )}

      {showImport && (
        <CsvImportModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            load()
          }}
        />
      )}

      {showForm && (
        <CandidateFormModal
          key={editTarget?.id ?? 'new'}
          candidate={editTarget}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            load()
          }}
        />
      )}
    </div>
  )
}

function CandidateRow({
  candidate,
  checked,
  onToggle,
  onEdit,
  onDelete,
}: {
  candidate: Candidate
  checked: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <tr className={`border-b border-zinc-50 ${checked ? 'bg-indigo-50/40' : ''}`}>
      <td className="px-4 py-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`Select ${candidate.first_name} ${candidate.last_name}`}
          className="rounded border-zinc-300"
        />
      </td>
      <td className="px-4 py-2 text-zinc-500">{candidate.number ?? '-'}</td>
      <td className="px-4 py-2 font-medium text-zinc-800">
        {candidate.first_name} {candidate.last_name}
      </td>
      <td className="px-4 py-2 text-zinc-600">{candidate.major || '-'}</td>
      <td className="px-4 py-2 text-zinc-600">
        {[candidate.grad_quarter, candidate.grad_year].filter(Boolean).join(' ') || '-'}
      </td>
      <td className="px-4 py-2 text-zinc-500">{candidate.email || '-'}</td>
      <td className="px-4 py-2 whitespace-nowrap">
        <button onClick={onEdit} className="text-indigo-600 font-medium text-xs mr-3">
          Edit
        </button>
        <button onClick={onDelete} className="text-red-500 text-xs">
          Delete
        </button>
      </td>
    </tr>
  )
}
