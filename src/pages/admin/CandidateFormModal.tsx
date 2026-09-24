import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  fetchActiveMembers,
  fetchLoads,
  getNextNumber,
  getNextRankOrder,
  insertAssignments,
  pickLightest,
  REVIEWERS_PER_CANDIDATE,
} from '../../lib/rc'
import { CloseIcon } from '../../components/icons'
import type { AnswerItem, Candidate, GradQuarter, RcMember, SummaryItem } from '../../lib/types'
import { GRAD_QUARTERS } from '../../lib/types'

interface CandidateFormModalProps {
  candidate: Candidate | null
  onClose: () => void
  onSaved: () => void
}

const inputClass =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600'

export function CandidateFormModal({ candidate, onClose, onSaved }: CandidateFormModalProps) {
  const editing = candidate !== null
  const [firstName, setFirstName] = useState(candidate?.first_name ?? '')
  const [lastName, setLastName] = useState(candidate?.last_name ?? '')
  const [email, setEmail] = useState(candidate?.email ?? '')
  const [photoUrl, setPhotoUrl] = useState(candidate?.photo_url ?? '')
  const [videoUrl, setVideoUrl] = useState(candidate?.video_url ?? '')
  const [major, setMajor] = useState(candidate?.major ?? '')
  const [gradYear, setGradYear] = useState(candidate?.grad_year?.toString() ?? '')
  const [gradQuarter, setGradQuarter] = useState<GradQuarter | ''>(candidate?.grad_quarter ?? '')
  const [summary, setSummary] = useState<SummaryItem[]>(candidate?.summary ?? [])
  const [answers, setAnswers] = useState<AnswerItem[]>(candidate?.answers ?? [])

  const [members, setMembers] = useState<RcMember[]>([])
  const [membersLoaded, setMembersLoaded] = useState(editing)
  const [loads, setLoads] = useState<Map<string, number>>(new Map())
  const [assignMode, setAssignMode] = useState<'auto' | 'manual'>('auto')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editing) return
    fetchActiveMembers().then(async (list) => {
      setMembers(list)
      setLoads(await fetchLoads(list))
      setMembersLoaded(true)
    })
  }, [editing])

  function togglePicked(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < REVIEWERS_PER_CANDIDATE) next.add(id)
      return next
    })
  }

  async function save() {
    if (!firstName.trim()) {
      setError('First name is required.')
      return
    }
    setError('')

    const fields = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      photo_url: photoUrl.trim() || null,
      video_url: videoUrl.trim() || null,
      major: major.trim() || null,
      grad_year: gradYear ? parseInt(gradYear, 10) : null,
      grad_quarter: gradQuarter || null,
      summary: summary.filter((s) => s.label.trim() && s.value.trim()),
      answers: answers.filter((a) => a.question.trim()),
    }

    setSaving(true)
    if (editing && candidate) {
      const { error: updateError } = await supabase.from('candidates').update(fields).eq('id', candidate.id)
      setSaving(false)
      if (updateError) {
        setError(updateError.message)
        return
      }
      onSaved()
      return
    }

    if (members.length < REVIEWERS_PER_CANDIDATE) {
      setSaving(false)
      setError(`Add at least ${REVIEWERS_PER_CANDIDATE} RC members before adding candidates.`)
      return
    }
    if (assignMode === 'manual' && picked.size !== REVIEWERS_PER_CANDIDATE) {
      setSaving(false)
      setError(`Pick exactly ${REVIEWERS_PER_CANDIDATE} reviewers.`)
      return
    }

    const number = await getNextNumber()
    const rank = await getNextRankOrder()
    const { data: created, error: insertError } = await supabase
      .from('candidates')
      .insert({ ...fields, number, rank_order: rank })
      .select('id')
      .single()
    if (insertError || !created) {
      setSaving(false)
      setError(insertError?.message ?? 'Could not add candidate.')
      return
    }

    const reviewerIds = assignMode === 'manual' ? Array.from(picked) : pickLightest(members, loads)
    const assignError = await insertAssignments(reviewerIds.map((id) => ({ candidate_id: created.id, rc_member_id: id })))
    if (assignError) {
      await supabase.from('candidates').delete().eq('id', created.id)
      setSaving(false)
      setError(`Reviewer assignment failed, so the candidate was not added: ${assignError}`)
      return
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl border border-zinc-200 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">{editing ? 'Edit Candidate' : 'Add Candidate'}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full text-zinc-500 flex items-center justify-center hover:bg-zinc-100"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name *">
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Last name">
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Email">
              <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Major">
              <input value={major} onChange={(e) => setMajor(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Grad quarter">
              <select
                value={gradQuarter}
                onChange={(e) => setGradQuarter(e.target.value as GradQuarter | '')}
                className={inputClass}
              >
                <option value="">None</option>
                {GRAD_QUARTERS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Grad year">
              <input
                value={gradYear}
                onChange={(e) => setGradYear(e.target.value.replace(/\D/g, ''))}
                className={inputClass}
              />
            </Field>
            <Field label="Photo link (Google Drive)">
              <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Video link (Google Drive)">
              <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className={inputClass} />
            </Field>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-zinc-700">Summary fields (shown in the RC row)</p>
            {summary.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={item.label}
                  onChange={(e) => setSummary(summary.map((s, j) => (j === i ? { ...s, label: e.target.value } : s)))}
                  placeholder="Label"
                  className={`${inputClass} max-w-[10rem]`}
                />
                <input
                  value={item.value}
                  onChange={(e) => setSummary(summary.map((s, j) => (j === i ? { ...s, value: e.target.value } : s)))}
                  placeholder="Value"
                  className={inputClass}
                />
                <button
                  onClick={() => setSummary(summary.filter((_, j) => j !== i))}
                  className="text-xs font-medium text-red-500 px-2"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => setSummary([...summary, { label: '', value: '' }])}
              className="self-start text-sm font-medium text-indigo-600"
            >
              Add summary field
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-zinc-700">Long answers (one screen each)</p>
            {answers.map((item, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 flex flex-col gap-2">
                  <input
                    value={item.question}
                    onChange={(e) =>
                      setAnswers(answers.map((a, j) => (j === i ? { ...a, question: e.target.value } : a)))
                    }
                    placeholder="Question"
                    className={inputClass}
                  />
                  <textarea
                    value={item.answer}
                    onChange={(e) =>
                      setAnswers(answers.map((a, j) => (j === i ? { ...a, answer: e.target.value } : a)))
                    }
                    rows={3}
                    placeholder="Answer"
                    className={inputClass}
                  />
                </div>
                <button
                  onClick={() => setAnswers(answers.filter((_, j) => j !== i))}
                  className="text-xs font-medium text-red-500 px-2 pt-2"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => setAnswers([...answers, { question: '', answer: '' }])}
              className="self-start text-sm font-medium text-indigo-600"
            >
              Add long answer
            </button>
          </div>

          {!editing && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-zinc-700">Reviewer assignment</p>
              {!membersLoaded ? (
                <p className="text-sm text-zinc-400">Loading reviewers…</p>
              ) : members.length < REVIEWERS_PER_CANDIDATE ? (
                <p className="text-sm text-amber-800 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
                  Add at least {REVIEWERS_PER_CANDIDATE} RC members in the RC Members tab first.
                </p>
              ) : (
                <>
                  <div className="flex gap-2">
                    {(['auto', 'manual'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setAssignMode(mode)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                          assignMode === mode
                            ? 'bg-indigo-600 text-white border-transparent'
                            : 'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        {mode === 'auto' ? `Auto (${REVIEWERS_PER_CANDIDATE} lightest loads)` : 'Pick reviewers'}
                      </button>
                    ))}
                  </div>
                  {assignMode === 'manual' && (
                    <div className="grid grid-cols-2 gap-2">
                      {members.map((m) => (
                        <label
                          key={m.id}
                          className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={picked.has(m.id)}
                            onChange={() => togglePicked(m.id)}
                            className="rounded border-zinc-300"
                          />
                          <span className="flex-1 text-zinc-800">{m.name}</span>
                          <span className="text-xs text-zinc-400">{loads.get(m.id) ?? 0}</span>
                        </label>
                      ))}
                      <p className="col-span-2 text-xs text-zinc-500">
                        {picked.size} of {REVIEWERS_PER_CANDIDATE} selected. Numbers show current load.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-700 font-medium hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !membersLoaded}
              className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add candidate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-zinc-500">{label}</label>
      {children}
    </div>
  )
}
