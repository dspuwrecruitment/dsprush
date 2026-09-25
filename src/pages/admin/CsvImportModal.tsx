import { useEffect, useMemo, useRef, useState } from 'react'
import { parseCsv } from '../../lib/csv'
import { supabase } from '../../lib/supabase'
import { CheckIcon, CloseIcon } from '../../components/icons'
import type { AnswerItem, GradQuarter, SummaryItem } from '../../lib/types'
import {
  fetchActiveMembers,
  fetchLoads,
  getNextNumber,
  getNextRankOrder,
  insertAssignments,
  normalizeQuarter,
  planAssignments,
  REVIEWERS_PER_CANDIDATE,
} from '../../lib/rc'

interface CsvImportModalProps {
  onClose: () => void
  onImported: () => void
}

const OTHER_FIELD_DEFS = [
  { key: 'email', label: 'Email' },
  { key: 'photo_url', label: 'Photo Link (Google Drive)' },
  { key: 'video_url', label: 'Video Link (Google Drive)' },
  { key: 'major', label: 'Major' },
  { key: 'grad_year', label: 'Grad Year' },
  { key: 'grad_quarter', label: 'Grad Quarter' },
] as const

type OtherFieldKey = (typeof OTHER_FIELD_DEFS)[number]['key']
type NameMode = 'separate' | 'full'
type ColumnRole = 'summary' | 'answer' | 'ignore'

interface CandidateRecord {
  first_name: string
  last_name: string
  email: string | null
  photo_url: string | null
  video_url: string | null
  major: string | null
  grad_year: number | null
  grad_quarter: GradQuarter | null
  summary: SummaryItem[]
  answers: AnswerItem[]
}

function defaultRole(header: string): ColumnRole {
  return header.toLowerCase().includes('timestamp') ? 'ignore' : 'answer'
}

export function CsvImportModal({ onClose, onImported }: CsvImportModalProps) {
  const [raw, setRaw] = useState('')
  const [nameMode, setNameMode] = useState<NameMode>('separate')
  const [firstNameCol, setFirstNameCol] = useState('')
  const [lastNameCol, setLastNameCol] = useState('')
  const [fullNameCol, setFullNameCol] = useState('')
  const [mapping, setMapping] = useState<Record<OtherFieldKey, string>>({
    email: '',
    photo_url: '',
    video_url: '',
    major: '',
    grad_year: '',
    grad_quarter: '',
  })
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null)
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set())
  const [confirmingDuplicates, setConfirmingDuplicates] = useState(false)
  const [roles, setRoles] = useState<Record<string, ColumnRole>>({})
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [importError, setImportError] = useState('')
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase
      .from('candidates')
      .select('first_name, last_name')
      .then(({ data }) => {
        setExistingNames(new Set((data ?? []).map((c) => `${c.first_name} ${c.last_name}`.trim().toLowerCase())))
      })
    fetchActiveMembers().then((members) => setMemberCount(members.length))
  }, [])

  const rows = useMemo(() => parseCsv(raw), [raw])
  const headers = rows[0] ?? []
  const dataRows = rows.slice(1)

  function guessMapping(headers: string[]) {
    const next: Record<OtherFieldKey, string> = { ...mapping }
    let first = ''
    let last = ''
    let full = ''
    for (const h of headers) {
      const lower = h.toLowerCase()
      if (lower.includes('first')) first = h
      else if (lower.includes('last')) last = h
      else if (lower.includes('email')) next.email = h
      else if (lower.includes('video')) next.video_url = h
      else if (lower.includes('photo') || lower.includes('image') || lower.includes('upload')) next.photo_url = h
      else if (lower.includes('major')) next.major = h
      else if (lower.includes('year')) next.grad_year = h
      else if (lower.includes('quarter')) next.grad_quarter = h
      else if (lower.includes('name')) full = h
    }
    setMapping(next)
    if (first && last) {
      setNameMode('separate')
      setFirstNameCol(first)
      setLastNameCol(last)
    } else if (full) {
      setNameMode('full')
      setFullNameCol(full)
    }
  }

  function handlePaste(text: string) {
    setRaw(text)
    setConfirmingDuplicates(false)
    const parsed = parseCsv(text)
    if (parsed[0]) guessMapping(parsed[0])
  }

  function loadFile(file: File) {
    setFileError('')
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setFileError('That doesn\'t look like a CSV file. Please drop a .csv export.')
      return
    }
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      handlePaste(String(reader.result ?? ''))
    }
    reader.onerror = () => {
      setFileError('Could not read that file. Try again or paste the CSV contents directly.')
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) loadFile(file)
  }

  function resetConfirmation() {
    setConfirmingDuplicates(false)
  }

  const canImport =
    dataRows.length > 0 && (nameMode === 'separate' ? firstNameCol && lastNameCol : !!fullNameCol)

  const unmappedHeaders = useMemo(() => {
    const mapped = new Set<string>(Object.values(mapping).filter(Boolean))
    if (nameMode === 'separate') {
      mapped.add(firstNameCol)
      mapped.add(lastNameCol)
    } else {
      mapped.add(fullNameCol)
    }
    return headers.filter((h) => !mapped.has(h))
  }, [headers, mapping, nameMode, firstNameCol, lastNameCol, fullNameCol])

  const records = useMemo<CandidateRecord[]>(() => {
    if (!canImport) return []
    const idx = (key: OtherFieldKey) => headers.indexOf(mapping[key])
    const firstIdx = headers.indexOf(firstNameCol)
    const lastIdx = headers.indexOf(lastNameCol)
    const fullIdx = headers.indexOf(fullNameCol)

    return dataRows
      .map((r) => {
        let firstName = ''
        let lastName = ''
        if (nameMode === 'separate') {
          firstName = firstIdx >= 0 ? r[firstIdx]?.trim() ?? '' : ''
          lastName = lastIdx >= 0 ? r[lastIdx]?.trim() ?? '' : ''
        } else {
          const rawName = fullIdx >= 0 ? r[fullIdx]?.trim() ?? '' : ''
          const spaceIdx = rawName.indexOf(' ')
          firstName = spaceIdx === -1 ? rawName : rawName.slice(0, spaceIdx)
          lastName = spaceIdx === -1 ? '' : rawName.slice(spaceIdx + 1).trim()
        }
        if (!firstName) return null

        const yearRaw = idx('grad_year') >= 0 ? r[idx('grad_year')]?.trim() : ''
        const parsedYear = yearRaw ? parseInt(yearRaw, 10) : NaN
        const majorRaw = idx('major') >= 0 ? r[idx('major')]?.trim() : ''

        const summary: SummaryItem[] = []
        const answers: AnswerItem[] = []
        for (const h of unmappedHeaders) {
          const role = roles[h] ?? defaultRole(h)
          const value = r[headers.indexOf(h)]?.trim() ?? ''
          if (role === 'summary' && value) summary.push({ label: h, value })
          if (role === 'answer') answers.push({ question: h, answer: value })
        }

        return {
          first_name: firstName,
          last_name: lastName,
          email: idx('email') >= 0 ? r[idx('email')]?.trim() || null : null,
          photo_url: idx('photo_url') >= 0 ? r[idx('photo_url')]?.trim() || null : null,
          video_url: idx('video_url') >= 0 ? r[idx('video_url')]?.trim() || null : null,
          major: majorRaw || null,
          grad_year: Number.isFinite(parsedYear) ? parsedYear : null,
          grad_quarter: idx('grad_quarter') >= 0 ? normalizeQuarter(r[idx('grad_quarter')]) : null,
          summary,
          answers,
        }
      })
      .filter((r): r is CandidateRecord => r !== null)
  }, [canImport, dataRows, headers, mapping, nameMode, firstNameCol, lastNameCol, fullNameCol, unmappedHeaders, roles])

  const recordsWithDupeFlag = useMemo(() => {
    const seenInBatch = new Set<string>()
    return records.map((r) => {
      const key = `${r.first_name} ${r.last_name}`.trim().toLowerCase()
      const isDuplicate = existingNames.has(key) || seenInBatch.has(key)
      seenInBatch.add(key)
      return { record: r, isDuplicate }
    })
  }, [records, existingNames])

  const duplicates = useMemo(() => {
    const names = new Set<string>()
    for (const { record, isDuplicate } of recordsWithDupeFlag) {
      if (isDuplicate) names.add(`${record.first_name} ${record.last_name}`)
    }
    return Array.from(names).sort()
  }, [recordsWithDupeFlag])

  async function runImport(mode: 'all' | 'skip-duplicates') {
    const toInsert =
      mode === 'skip-duplicates'
        ? recordsWithDupeFlag.filter((r) => !r.isDuplicate).map((r) => r.record)
        : records
    if (toInsert.length === 0) {
      setImportError('There are no candidates to import.')
      return
    }
    setImporting(true)
    setImportError('')

    const members = await fetchActiveMembers()
    if (members.length < REVIEWERS_PER_CANDIDATE) {
      setImporting(false)
      setImportError(`Add at least ${REVIEWERS_PER_CANDIDATE} RC members before importing.`)
      return
    }

    const startNumber = await getNextNumber()
    const startRank = await getNextRankOrder()
    const withNumbers = toInsert.map((r, i) => ({
      ...r,
      number: startNumber + i,
      rank_order: startRank === null ? null : startRank + i,
    }))

    const { data: inserted, error } = await supabase.from('candidates').insert(withNumbers).select('id')
    if (error || !inserted) {
      setImporting(false)
      setImportError(error?.message ?? 'Import failed.')
      return
    }

    const ids = inserted.map((c) => c.id as string)
    const plan = planAssignments(ids, members, await fetchLoads(members))
    const assignError = await insertAssignments(plan)
    if (assignError) {
      await supabase.from('candidates').delete().in('id', ids)
      setImporting(false)
      setImportError(`Reviewer assignment failed, so this import was rolled back: ${assignError}`)
      return
    }

    setImporting(false)
    setResult({ inserted: toInsert.length, skipped: dataRows.length - toInsert.length })
    onImported()
  }

  function handleImportClick() {
    if (!canImport) return
    if (duplicates.length > 0 && !confirmingDuplicates) {
      setConfirmingDuplicates(true)
      return
    }
    runImport('all')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl bg-white rounded-xl border border-zinc-200 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Import Candidates</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-zinc-500 flex items-center justify-center hover:bg-zinc-100"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {!result ? (
            <>
              <p className="text-sm text-zinc-500">
                Export your Google Sheet as CSV (File → Download → Comma Separated Values), then drag the file in
                or paste its contents below, including the header row. Each candidate is numbered and assigned to{' '}
                {REVIEWERS_PER_CANDIDATE} RC reviewers.
              </p>
              {memberCount !== null && memberCount < REVIEWERS_PER_CANDIDATE && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Add at least {REVIEWERS_PER_CANDIDATE} RC members in the RC Members tab before importing. There are
                  currently {memberCount}.
                </div>
              )}

              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-lg border-2 border-dashed px-4 py-5 text-center cursor-pointer transition-colors ${
                  isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50'
                }`}
              >
                <p className="text-sm text-zinc-600">
                  {fileName ? (
                    <>
                      Loaded <span className="font-medium text-zinc-800">{fileName}</span> — drop another file to
                      replace it
                    </>
                  ) : (
                    <>Drag a CSV file here, or click to browse</>
                  )}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) loadFile(file)
                    e.target.value = ''
                  }}
                />
              </div>
              {fileError && <p className="text-sm text-red-600">{fileError}</p>}

              <textarea
                value={raw}
                onChange={(e) => {
                  setFileName('')
                  handlePaste(e.target.value)
                }}
                rows={6}
                placeholder="…or paste CSV data here"
                className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              />

              {headers.length > 0 && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-zinc-500">Name format</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNameMode('separate')
                          resetConfirmation()
                        }}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                          nameMode === 'separate'
                            ? 'bg-indigo-600 text-white border-transparent'
                            : 'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        Separate First / Last columns
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNameMode('full')
                          resetConfirmation()
                        }}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                          nameMode === 'full'
                            ? 'bg-indigo-600 text-white border-transparent'
                            : 'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        Single full name column
                      </button>
                    </div>
                  </div>

                  {nameMode === 'separate' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-zinc-500">
                          First Name<span className="text-red-500"> *</span>
                        </label>
                        <select
                          value={firstNameCol}
                          onChange={(e) => {
                            setFirstNameCol(e.target.value)
                            resetConfirmation()
                          }}
                          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                        >
                          <option value="">— none —</option>
                          {headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-zinc-500">
                          Last Name<span className="text-red-500"> *</span>
                        </label>
                        <select
                          value={lastNameCol}
                          onChange={(e) => {
                            setLastNameCol(e.target.value)
                            resetConfirmation()
                          }}
                          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                        >
                          <option value="">— none —</option>
                          {headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 max-w-xs">
                      <label className="text-xs text-zinc-500">
                        Full Name (split into first / last on the first space)
                        <span className="text-red-500"> *</span>
                      </label>
                      <select
                        value={fullNameCol}
                        onChange={(e) => {
                          setFullNameCol(e.target.value)
                          resetConfirmation()
                        }}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                      >
                        <option value="">— none —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-zinc-700">
                      Other columns ({dataRows.length} rows detected)
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {OTHER_FIELD_DEFS.map((f) => (
                        <div key={f.key} className="flex flex-col gap-1">
                          <label className="text-xs text-zinc-500">{f.label}</label>
                          <select
                            value={mapping[f.key]}
                            onChange={(e) => {
                              setMapping({ ...mapping, [f.key]: e.target.value })
                              resetConfirmation()
                            }}
                            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                          >
                            <option value="">— none —</option>
                            {headers.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {unmappedHeaders.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-medium text-zinc-700">Remaining columns</p>
                      <p className="text-xs text-zinc-500">
                        Summary values show in the RC row and first screen. Long answers get their own screen.
                      </p>
                      <div className="flex flex-col divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                        {unmappedHeaders.map((h) => (
                          <div key={h} className="flex items-center justify-between gap-3 px-3 py-2">
                            <span className="text-sm text-zinc-700 truncate" title={h}>
                              {h}
                            </span>
                            <select
                              value={roles[h] ?? defaultRole(h)}
                              onChange={(e) => setRoles({ ...roles, [h]: e.target.value as ColumnRole })}
                              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-600 shrink-0"
                            >
                              <option value="summary">Summary</option>
                              <option value="answer">Long answer</option>
                              <option value="ignore">Ignore</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {importError && <p className="text-sm text-red-600">{importError}</p>}

              {confirmingDuplicates && duplicates.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 flex flex-col gap-2">
                  <p className="text-sm font-medium text-amber-900">
                    {duplicates.length} name{duplicates.length > 1 ? 's' : ''} already exist
                    {duplicates.length === 1 ? 's' : ''} or repeat{duplicates.length === 1 ? 's' : ''} within this
                    file:
                  </p>
                  <ul className="text-sm text-amber-800 max-h-28 overflow-y-auto list-disc pl-5">
                    {duplicates.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                  <p className="text-sm text-amber-800">
                    Skip them and import the rest, or import everything including duplicates?
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {confirmingDuplicates && duplicates.length > 0 ? (
                  <>
                    <button
                      onClick={() => setConfirmingDuplicates(false)}
                      className="rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-700 font-medium hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => runImport('skip-duplicates')}
                      disabled={importing || memberCount === null || memberCount < REVIEWERS_PER_CANDIDATE}
                      className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {importing
                        ? 'Importing…'
                        : `Skip duplicates, import ${recordsWithDupeFlag.filter((r) => !r.isDuplicate).length}`}
                    </button>
                    <button
                      onClick={() => runImport('all')}
                      disabled={importing || memberCount === null || memberCount < REVIEWERS_PER_CANDIDATE}
                      className="flex-1 rounded-lg bg-amber-600 py-2.5 text-white font-medium hover:bg-amber-700 disabled:opacity-50"
                    >
                      {importing ? 'Importing…' : `Import all ${records.length}`}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleImportClick}
                    disabled={
                      !canImport || importing || memberCount === null || memberCount < REVIEWERS_PER_CANDIDATE
                    }
                    className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {importing ? 'Importing…' : `Import ${dataRows.length || ''} candidates`}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-6 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center ring-1 ring-emerald-200">
                <CheckIcon className="w-6 h-6" />
              </div>
              <p className="text-zinc-800 font-medium">
                Imported {result.inserted} candidates and assigned each to {REVIEWERS_PER_CANDIDATE} reviewers
                {result.skipped > 0 && ` (${result.skipped} skipped)`}
              </p>
              <button
                onClick={onClose}
                className="rounded-lg bg-zinc-900 text-white px-6 py-2.5 font-medium hover:bg-zinc-800"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
