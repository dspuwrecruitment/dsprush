import { useEffect, useMemo, useRef, useState } from 'react'
import { parseCsv } from '../../lib/csv'
import { supabase } from '../../lib/supabase'
import { CheckIcon, CloseIcon } from '../../components/icons'
import { buildNameMap, normalizeName, resolveMatch, type MatchCandidate } from '../../lib/candidateMatch'
import { GRAD_QUARTERS, type CandidateList, type GradQuarter } from '../../lib/types'

interface CsvImportModalProps {
  listKey: CandidateList
  onClose: () => void
  onImported: () => void
}

const OTHER_FIELD_DEFS = [
  { key: 'email', label: 'Email' },
  { key: 'photo_url', label: 'Photo Link (Google Drive)' },
  { key: 'major', label: 'Major (optional)' },
  { key: 'grad_date', label: 'Grad Date, e.g. "Spring 2027" (optional)' },
] as const

type OtherFieldKey = (typeof OTHER_FIELD_DEFS)[number]['key']
type NameMode = 'separate' | 'full'

interface CandidateRecord {
  first_name: string
  last_name: string
  email: string | null
  photo_url: string | null
  major: string | null
  grad_year: number | null
  grad_quarter: GradQuarter | null
}

interface ExistingCandidate extends MatchCandidate {
  major: string | null
  grad_year: number | null
  grad_quarter: GradQuarter | null
  photo_url: string | null
}

type ClassifiedRow =
  | { record: CandidateRecord; kind: 'new' }
  | { record: CandidateRecord; kind: 'ambiguous' }
  | { record: CandidateRecord; kind: 'duplicate' }
  | { record: CandidateRecord; kind: 'merge'; match: ExistingCandidate }

function parseGradDate(raw: string | undefined): { quarter: GradQuarter; year: number } | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null
  const parts = trimmed.split(/\s+/)
  if (parts.length !== 2) return null
  const [a, b] = parts
  const tryParse = (quarterToken: string, yearToken: string) => {
    const quarter = GRAD_QUARTERS.find((q) => q.toLowerCase() === quarterToken.toLowerCase())
    const year = parseInt(yearToken, 10)
    return quarter && Number.isFinite(year) ? { quarter, year } : null
  }
  return tryParse(a, b) ?? tryParse(b, a)
}

const LIST_LABEL: Record<CandidateList, string> = {
  rush: 'Candidates',
  coffee_chat: 'Coffee Chat Candidates',
}
const LIST_COLUMN: Record<CandidateList, 'is_rush_candidate' | 'is_coffee_chat'> = {
  rush: 'is_rush_candidate',
  coffee_chat: 'is_coffee_chat',
}
const OTHER_LIST_LABEL: Record<CandidateList, string> = {
  rush: 'Coffee Chat Candidates',
  coffee_chat: 'Candidates',
}

export function CsvImportModal({ listKey, onClose, onImported }: CsvImportModalProps) {
  const [raw, setRaw] = useState('')
  const [nameMode, setNameMode] = useState<NameMode>('separate')
  const [firstNameCol, setFirstNameCol] = useState('')
  const [lastNameCol, setLastNameCol] = useState('')
  const [fullNameCol, setFullNameCol] = useState('')
  const [mapping, setMapping] = useState<Record<OtherFieldKey, string>>({
    email: '',
    photo_url: '',
    major: '',
    grad_date: '',
  })
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ created: number; merged: number; skipped: number; ambiguous: string[]; addedNames: string[]; mergedNames: string[] } | null>(
    null,
  )
  const [importError, setImportError] = useState('')
  const [existing, setExisting] = useState<ExistingCandidate[]>([])
  const [confirmingDuplicates, setConfirmingDuplicates] = useState(false)
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase
      .from('candidates')
      .select('id, first_name, last_name, email, major, grad_year, grad_quarter, photo_url, is_coffee_chat, is_rush_candidate')
      .then(({ data }) => setExisting((data as ExistingCandidate[]) ?? []))
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
      else if (lower.includes('photo') || lower.includes('image') || lower.includes('upload')) next.photo_url = h
      else if (lower.includes('major')) next.major = h
      else if (lower.includes('grad')) next.grad_date = h
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

        const gradRaw = idx('grad_date') >= 0 ? r[idx('grad_date')] : undefined
        const grad = parseGradDate(gradRaw)

        const majorRaw = idx('major') >= 0 ? r[idx('major')]?.trim() : ''

        return {
          first_name: firstName,
          last_name: lastName,
          email: idx('email') >= 0 ? r[idx('email')]?.trim() || null : null,
          photo_url: idx('photo_url') >= 0 ? r[idx('photo_url')]?.trim() || null : null,
          major: majorRaw || null,
          grad_year: grad?.year ?? null,
          grad_quarter: grad?.quarter ?? null,
        }
      })
      .filter((r): r is CandidateRecord => r !== null)
  }, [canImport, dataRows, headers, mapping, nameMode, firstNameCol, lastNameCol, fullNameCol])

  const classified = useMemo<ClassifiedRow[]>(() => {
    const nameMap = buildNameMap(existing)
    const seenInBatch = new Set<string>()
    return records.map((record) => {
      const key = normalizeName(record.first_name, record.last_name)
      const inBatchDup = seenInBatch.has(key)
      seenInBatch.add(key)
      if (inBatchDup) return { record, kind: 'duplicate' as const }

      const { match, ambiguous } = resolveMatch(nameMap, record.first_name, record.last_name, record.email)
      if (match) {
        const alreadyInThisList = listKey === 'rush' ? match.is_rush_candidate : match.is_coffee_chat
        if (alreadyInThisList) return { record, kind: 'duplicate' as const }
        return { record, kind: 'merge' as const, match }
      }
      if (ambiguous) return { record, kind: 'ambiguous' as const }
      return { record, kind: 'new' as const }
    })
  }, [records, existing, listKey])

  const duplicateNames = useMemo(
    () =>
      Array.from(
        new Set(
          classified
            .filter((c): c is Extract<ClassifiedRow, { kind: 'duplicate' }> => c.kind === 'duplicate')
            .map((c) => `${c.record.first_name} ${c.record.last_name}`),
        ),
      ).sort(),
    [classified],
  )
  const mergeCount = useMemo(() => classified.filter((c) => c.kind === 'merge').length, [classified])
  const ambiguousNames = useMemo(
    () =>
      classified
        .filter((c): c is Extract<ClassifiedRow, { kind: 'ambiguous' }> => c.kind === 'ambiguous')
        .map((c) => `${c.record.first_name} ${c.record.last_name}`),
    [classified],
  )
  const newCount = useMemo(() => classified.filter((c) => c.kind === 'new').length, [classified])

  function buildInsertRow(record: CandidateRecord) {
    return { ...record, [LIST_COLUMN[listKey]]: true }
  }

  function buildMergeUpdate(record: CandidateRecord, match: ExistingCandidate) {
    const protectExisting = listKey === 'coffee_chat' && match.is_rush_candidate
    const update: Record<string, unknown> = { [LIST_COLUMN[listKey]]: true }
    const fields: (keyof CandidateRecord)[] = ['email', 'photo_url', 'major', 'grad_year', 'grad_quarter']
    for (const f of fields) {
      const newVal = record[f]
      if (newVal === null || newVal === undefined) continue
      if (protectExisting && match[f] !== null && match[f] !== undefined) continue
      update[f] = newVal
    }
    return update
  }

  async function runImport(mode: 'all' | 'skip-duplicates') {
    setImporting(true)
    setImportError('')

    const toProcess = mode === 'skip-duplicates' ? classified.filter((c) => c.kind !== 'duplicate') : classified
    const toInsert = toProcess.filter((c) => c.kind !== 'merge').map((c) => buildInsertRow(c.record))
    const toMerge = toProcess.filter((c): c is Extract<ClassifiedRow, { kind: 'merge' }> => c.kind === 'merge')

    if (toInsert.length > 0) {
      const { error } = await supabase.from('candidates').insert(toInsert)
      if (error) {
        setImporting(false)
        setImportError(error.message)
        return
      }
    }

    const mergeResults = await Promise.all(
      toMerge.map((c) =>
        supabase
          .from('candidates')
          .update(buildMergeUpdate(c.record, c.match))
          .eq('id', c.match.id),
      ),
    )
    const mergeError = mergeResults.find((r) => r.error)?.error
    if (mergeError) {
      setImporting(false)
      setImportError(mergeError.message)
      return
    }

    setImporting(false)
    const skippedCount = mode === 'skip-duplicates' ? classified.length - toProcess.length : 0
    setResult({
      created: toInsert.length,
      merged: toMerge.length,
      skipped: skippedCount,
      ambiguous: toProcess
        .filter((c): c is Extract<ClassifiedRow, { kind: 'ambiguous' }> => c.kind === 'ambiguous')
        .map((c) => `${c.record.first_name} ${c.record.last_name}`),
      addedNames: toInsert.map((r) => `${r.first_name} ${r.last_name}`),
      mergedNames: toMerge.map((c) => `${c.record.first_name} ${c.record.last_name}`),
    })
    onImported()
  }

  function handleImportClick() {
    if (!canImport) return
    if (duplicateNames.length > 0 && !confirmingDuplicates) {
      setConfirmingDuplicates(true)
      return
    }
    runImport('all')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl border border-zinc-200 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Import {LIST_LABEL[listKey]}</h2>
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
                or paste its contents below, including the header row. Grad date should read like "Spring 2027"
                in a single column. Major and grad date are left blank for any candidate missing them — no
                placeholder values are generated. If a name here already exists in {OTHER_LIST_LABEL[listKey]},
                that person is matched by name (and by email if the name is shared by more than one person) and
                merged into one record instead of being added twice.
              </p>

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

                  {(newCount > 0 || mergeCount > 0 || ambiguousNames.length > 0) && (
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 flex flex-col gap-1">
                      {newCount > 0 && <p>{newCount} will be added as new.</p>}
                      {mergeCount > 0 && (
                        <p>
                          {mergeCount} already exist{mergeCount === 1 ? 's' : ''} in {OTHER_LIST_LABEL[listKey]} and
                          will be merged into that record.
                        </p>
                      )}
                      {ambiguousNames.length > 0 && (
                        <p className="text-amber-800">
                          {ambiguousNames.length} share a name with more than one existing candidate and couldn't be
                          matched by email — added as new, flagged for manual review: {ambiguousNames.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {importError && <p className="text-sm text-red-600">{importError}</p>}

              {confirmingDuplicates && duplicateNames.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 flex flex-col gap-2">
                  <p className="text-sm font-medium text-amber-900">
                    {duplicateNames.length} name{duplicateNames.length > 1 ? 's' : ''} already exist
                    {duplicateNames.length === 1 ? 's' : ''} in {LIST_LABEL[listKey]} or repeat within this file:
                  </p>
                  <ul className="text-sm text-amber-800 max-h-28 overflow-y-auto list-disc pl-5">
                    {duplicateNames.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                  <p className="text-sm text-amber-800">
                    Skip them and import the rest, or import everything including duplicates?
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {confirmingDuplicates && duplicateNames.length > 0 ? (
                  <>
                    <button
                      onClick={() => setConfirmingDuplicates(false)}
                      className="rounded-lg border border-zinc-300 px-4 py-2.5 text-zinc-700 font-medium hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => runImport('skip-duplicates')}
                      disabled={importing}
                      className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {importing
                        ? 'Importing…'
                        : `Skip duplicates, import ${classified.length - duplicateNames.length}`}
                    </button>
                    <button
                      onClick={() => runImport('all')}
                      disabled={importing}
                      className="flex-1 rounded-lg bg-amber-600 py-2.5 text-white font-medium hover:bg-amber-700 disabled:opacity-50"
                    >
                      {importing ? 'Importing…' : `Import all ${classified.length}`}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleImportClick}
                    disabled={!canImport || importing}
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
                {result.created} candidate{result.created === 1 ? '' : 's'} added
                {result.merged > 0 && `, ${result.merged} merged into existing records`}
                {result.skipped > 0 && ` (${result.skipped} skipped)`}
              </p>
              {result.addedNames.length > 0 && (
                <div className="w-full text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1.5">
                    New ({result.addedNames.length})
                  </p>
                  <ul className="max-h-56 overflow-y-auto rounded-lg border border-zinc-200 divide-y divide-zinc-100 bg-white">
                    {result.addedNames.map((n, i) => (
                      <li key={`${n}-${i}`} className="px-3 py-1.5 text-sm text-zinc-800">
                        {n}
                        {result.ambiguous.includes(n) && (
                          <span className="ml-2 text-xs text-amber-800">needs review</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {result.mergedNames.length > 0 && (
                <div className="w-full text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1.5">
                    Merged into existing ({result.mergedNames.length})
                  </p>
                  <ul className="max-h-40 overflow-y-auto rounded-lg border border-zinc-200 divide-y divide-zinc-100 bg-white">
                    {result.mergedNames.map((n, i) => (
                      <li key={`${n}-m-${i}`} className="px-3 py-1.5 text-sm text-zinc-600">
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
