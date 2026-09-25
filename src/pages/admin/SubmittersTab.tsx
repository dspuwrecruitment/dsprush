import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Submitter } from '../../lib/types'

export function SubmittersTab() {
  const [submitters, setSubmitters] = useState<Submitter[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('submitters').select('*').order('name')
    setSubmitters(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function addSubmitter() {
    const names = name
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n.length > 0)
    if (names.length === 0) return
    setSaving(true)
    await supabase.from('submitters').insert(names.map((n) => ({ name: n })))
    setName('')
    setSaving(false)
    load()
  }

  async function toggleActive(s: Submitter) {
    await supabase.from('submitters').update({ active: !s.active }).eq('id', s.id)
    load()
  }

  async function remove(s: Submitter) {
    if (!confirm(`Remove ${s.name}? Their past comments will stay, but they won't appear in the submitter list.`)) return
    await supabase.from('submitters').delete().eq('id', s.id)
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
    setSelected((prev) => (prev.size === submitters.length ? new Set() : new Set(submitters.map((s) => s.id))))
  }

  async function deleteSelected() {
    const count = selected.size
    if (count === 0) return
    if (
      !confirm(
        `Remove ${count} submitter${count > 1 ? 's' : ''}? Their past comments will stay, but they won't appear in the submitter list.`,
      )
    )
      return
    setDeleting(true)
    await supabase.from('submitters').delete().in('id', Array.from(selected))
    setSelected(new Set())
    setDeleting(false)
    load()
  }

  const allSelected = submitters.length > 0 && selected.size === submitters.length

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">Submitters</h2>

      <div className="flex flex-col gap-2 mb-6">
        <label className="text-xs text-zinc-500">
          Full name, or paste multiple names separated by commas
        </label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSubmitter()}
            placeholder="e.g. Jane Doe, John Smith, Alex Lee"
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
          />
          <button
            onClick={addSubmitter}
            disabled={saving || !name.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : (
        <>
          {submitters.length > 0 && (
            <div className="flex items-center gap-3 mb-2 px-1">
              <label className="flex items-center gap-2 text-sm text-zinc-600">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-zinc-300"
                />
                Select all
              </label>
              {selected.size > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1">
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
          )}
          <div className="flex flex-col gap-2">
            {submitters.map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 bg-white border rounded-lg px-4 py-2.5 ${
                  selected.has(s.id) ? 'border-indigo-300 bg-indigo-50/40' : 'border-zinc-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggleSelected(s.id)}
                  aria-label={`Select ${s.name}`}
                  className="rounded border-zinc-300"
                />
                <span className={`flex-1 text-sm ${s.active ? 'text-zinc-800' : 'text-zinc-400 line-through'}`}>
                  {s.name}
                </span>
                <button
                  onClick={() => toggleActive(s)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  {s.active ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => remove(s)}
                  className="text-xs font-medium text-red-500 px-2 py-1"
                >
                  Delete
                </button>
              </div>
            ))}
            {submitters.length === 0 && (
              <p className="text-sm text-zinc-400">No submitters yet. Add the names of everyone who'll be logging comments.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
