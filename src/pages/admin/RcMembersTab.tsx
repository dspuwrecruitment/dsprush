import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fetchActiveMembers, fetchLoads } from '../../lib/rc'
import type { RcMember } from '../../lib/types'

export function RcMembersTab() {
  const [members, setMembers] = useState<RcMember[]>([])
  const [loads, setLoads] = useState<Map<string, number>>(new Map())
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const list = await fetchActiveMembers()
    setMembers(list)
    setLoads(await fetchLoads(list))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function addMembers() {
    const names = name
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n.length > 0)
    if (names.length === 0) return
    setSaving(true)
    setError('')
    const { error: insertError } = await supabase.from('rc_members').insert(names.map((n) => ({ name: n })))
    setSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setName('')
    load()
  }

  async function saveEdit(id: string) {
    const trimmed = editName.trim()
    if (!trimmed) return
    const { error: updateError } = await supabase.from('rc_members').update({ name: trimmed }).eq('id', id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setEditingId(null)
    load()
  }

  async function removeMember(m: RcMember) {
    const { count } = await supabase
      .from('review_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('rc_member_id', m.id)
      .is('score', null)
    const pending = count ?? 0
    if (
      !confirm(
        `Remove ${m.name} from the Recruitment Committee?\n\n${pending} unscored application${pending === 1 ? '' : 's'} will be pulled from their queue and will NOT be reassigned. Scores they already submitted stay.`,
      )
    )
      return
    setError('')
    const { error: deleteError } = await supabase
      .from('review_assignments')
      .delete()
      .eq('rc_member_id', m.id)
      .is('score', null)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    const { error: updateError } = await supabase
      .from('rc_members')
      .update({ removed_at: new Date().toISOString() })
      .eq('id', m.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    load()
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-semibold text-zinc-900 mb-1">Recruitment Committee ({members.length})</h2>
      <p className="text-sm text-zinc-500 mb-4">
        Candidates are assigned across these members at import. At least 3 members are required to import.
      </p>

      <div className="flex flex-col gap-2 mb-6">
        <label className="text-xs text-zinc-500">Full name, or paste multiple names separated by commas</label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMembers()}
            placeholder="e.g. Jane Doe, John Smith"
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
          />
          <button
            onClick={addMembers}
            disabled={saving || !name.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 bg-white border border-zinc-200 rounded-lg px-4 py-2.5">
              {editingId === m.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(m.id)}
                    autoFocus
                    className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                  <button onClick={() => saveEdit(m.id)} className="text-xs font-medium text-indigo-600 px-2 py-1">
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-zinc-400 px-2 py-1">
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-zinc-800">{m.name}</span>
                  <span className="text-xs text-zinc-400">{loads.get(m.id) ?? 0} assigned</span>
                  <button
                    onClick={() => {
                      setEditingId(m.id)
                      setEditName(m.name)
                    }}
                    className="text-xs font-medium text-indigo-600 px-2 py-1"
                  >
                    Edit
                  </button>
                  <button onClick={() => removeMember(m)} className="text-xs font-medium text-red-500 px-2 py-1">
                    Remove
                  </button>
                </>
              )}
            </div>
          ))}
          {members.length === 0 && (
            <p className="text-sm text-zinc-400">No RC members yet. Add the 10 committee members here.</p>
          )}
        </div>
      )}
    </div>
  )
}
