import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Submitter } from '../../lib/types'

export function SubmittersTab() {
  const [submitters, setSubmitters] = useState<Submitter[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    await supabase.from('submitters').insert({ name: trimmed })
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

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">Submitters</h2>

      <div className="flex gap-2 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSubmitter()}
          placeholder="Full name"
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={addSubmitter}
          disabled={saving || !name.trim()}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {submitters.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 bg-white border border-zinc-100 rounded-xl px-4 py-2.5"
            >
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
      )}
    </div>
  )
}
