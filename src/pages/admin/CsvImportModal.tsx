import { useMemo, useState } from 'react'
import { parseCsv } from '../../lib/csv'
import { supabase } from '../../lib/supabase'

interface CsvImportModalProps {
  onClose: () => void
  onImported: () => void
}

const FIELD_DEFS = [
  { key: 'first_name', label: 'First Name', required: true },
  { key: 'last_name', label: 'Last Name', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'photo_url', label: 'Photo Link (Google Drive)', required: false },
  { key: 'major', label: 'Major', required: false },
  { key: 'grad_year', label: 'Grad Year', required: false },
  { key: 'grad_quarter', label: 'Grad Quarter', required: false },
] as const

type FieldKey = (typeof FIELD_DEFS)[number]['key']

export function CsvImportModal({ onClose, onImported }: CsvImportModalProps) {
  const [raw, setRaw] = useState('')
  const [mapping, setMapping] = useState<Record<FieldKey, string>>({
    first_name: '',
    last_name: '',
    email: '',
    photo_url: '',
    major: '',
    grad_year: '',
    grad_quarter: '',
  })
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null)

  const rows = useMemo(() => parseCsv(raw), [raw])
  const headers = rows[0] ?? []
  const dataRows = rows.slice(1)

  function guessMapping(headers: string[]) {
    const next: Record<FieldKey, string> = { ...mapping }
    for (const h of headers) {
      const lower = h.toLowerCase()
      if (lower.includes('first')) next.first_name = h
      else if (lower.includes('last')) next.last_name = h
      else if (lower.includes('email')) next.email = h
      else if (lower.includes('photo') || lower.includes('image') || lower.includes('upload')) next.photo_url = h
      else if (lower.includes('major')) next.major = h
      else if (lower.includes('year')) next.grad_year = h
      else if (lower.includes('quarter')) next.grad_quarter = h
    }
    setMapping(next)
  }

  function handlePaste(text: string) {
    setRaw(text)
    const parsed = parseCsv(text)
    if (parsed[0]) guessMapping(parsed[0])
  }

  const canImport = mapping.first_name && mapping.last_name && dataRows.length > 0

  async function handleImport() {
    if (!canImport) return
    setImporting(true)
    const idx = (key: FieldKey) => headers.indexOf(mapping[key])

    const records = dataRows
      .map((r) => {
        const firstName = idx('first_name') >= 0 ? r[idx('first_name')]?.trim() : ''
        const lastName = idx('last_name') >= 0 ? r[idx('last_name')]?.trim() : ''
        if (!firstName || !lastName) return null
        const yearRaw = idx('grad_year') >= 0 ? r[idx('grad_year')]?.trim() : ''
        const year = yearRaw ? parseInt(yearRaw, 10) : null
        return {
          first_name: firstName,
          last_name: lastName,
          email: idx('email') >= 0 ? r[idx('email')]?.trim() || null : null,
          photo_url: idx('photo_url') >= 0 ? r[idx('photo_url')]?.trim() || null : null,
          major: idx('major') >= 0 ? r[idx('major')]?.trim() || null : null,
          grad_year: Number.isFinite(year) ? year : null,
          grad_quarter: idx('grad_quarter') >= 0 ? r[idx('grad_quarter')]?.trim() || null : null,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    const { error } = await supabase.from('candidates').insert(records)
    setImporting(false)
    if (!error) {
      setResult({ inserted: records.length, skipped: dataRows.length - records.length })
      onImported()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Import Candidates</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {!result ? (
            <>
              <p className="text-sm text-zinc-500">
                Export your Google Sheet as CSV (File → Download → Comma Separated Values) and paste the contents
                below, including the header row.
              </p>
              <textarea
                value={raw}
                onChange={(e) => handlePaste(e.target.value)}
                rows={6}
                placeholder="Paste CSV data here…"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
              />

              {headers.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium text-zinc-700">
                    Map columns ({dataRows.length} rows detected)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {FIELD_DEFS.map((f) => (
                      <div key={f.key} className="flex flex-col gap-1">
                        <label className="text-xs text-zinc-500">
                          {f.label}
                          {f.required && <span className="text-red-500"> *</span>}
                        </label>
                        <select
                          value={mapping[f.key]}
                          onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                          className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
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
              )}

              <button
                onClick={handleImport}
                disabled={!canImport || importing}
                className="w-full rounded-xl bg-indigo-600 py-3 text-white font-medium disabled:opacity-50"
              >
                {importing ? 'Importing…' : `Import ${dataRows.length || ''} candidates`}
              </button>
            </>
          ) : (
            <div className="text-center py-6 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl">
                ✓
              </div>
              <p className="text-zinc-800 font-medium">
                Imported {result.inserted} candidates
                {result.skipped > 0 && ` (${result.skipped} skipped, missing name)`}
              </p>
              <button onClick={onClose} className="rounded-xl bg-zinc-900 text-white px-6 py-2.5 font-medium">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
