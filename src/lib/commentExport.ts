import { supabase } from './supabase'
import { SENTIMENTS, type Sentiment } from './types'

// Read-only: this module never writes to the comments table.
const SENTIMENT_RANK: Record<Sentiment, number> = {
  very_positive: 0,
  slightly_positive: 1,
  neutral: 2,
  slightly_negative: 3,
  very_negative: 4,
}

const HEADERS = [
  'Candidate',
  'Candidate Comments (total)',
  'Email',
  'Major',
  'Grad Date',
  'Sentiment',
  'Knows Outside Rush',
  'Coffee Chat',
  'Submitted By',
  'Submitted At',
  'Comment',
]

interface ExportComment {
  id: string
  candidate_id: string
  sentiment: Sentiment
  comment_text: string
  knows_outside_rush: boolean
  was_coffee_chat: boolean
  created_at: string
  candidates: {
    first_name: string
    last_name: string
    email: string | null
    major: string | null
    grad_quarter: string | null
    grad_year: number | null
  } | null
  submitters: { name: string } | null
}

async function fetchAllComments(): Promise<ExportComment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(
      '*, candidates(first_name, last_name, email, major, grad_quarter, grad_year), submitters(name)',
    )
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as unknown as ExportComment[]) ?? []
}

function candidateName(c: ExportComment): string {
  return c.candidates ? `${c.candidates.first_name} ${c.candidates.last_name}`.trim() : 'Unknown candidate'
}

function buildRows(comments: ExportComment[]): string[][] {
  const countByCandidate = new Map<string, number>()
  for (const c of comments) countByCandidate.set(c.candidate_id, (countByCandidate.get(c.candidate_id) ?? 0) + 1)

  const sorted = [...comments].sort((a, b) => {
    const countDiff = (countByCandidate.get(b.candidate_id) ?? 0) - (countByCandidate.get(a.candidate_id) ?? 0)
    if (countDiff !== 0) return countDiff
    const nameDiff = candidateName(a).localeCompare(candidateName(b))
    if (nameDiff !== 0) return nameDiff
    const sentDiff = SENTIMENT_RANK[a.sentiment] - SENTIMENT_RANK[b.sentiment]
    if (sentDiff !== 0) return sentDiff
    return a.created_at.localeCompare(b.created_at)
  })

  return sorted.map((c) => {
    const grad = [c.candidates?.grad_quarter, c.candidates?.grad_year].filter(Boolean).join(' ')
    return [
      candidateName(c),
      String(countByCandidate.get(c.candidate_id) ?? 0),
      c.candidates?.email ?? '',
      c.candidates?.major ?? '',
      grad,
      SENTIMENTS.find((s) => s.value === c.sentiment)?.label ?? c.sentiment,
      c.knows_outside_rush ? 'Yes' : 'No',
      c.was_coffee_chat ? 'Yes' : 'No',
      c.submitters?.name ?? 'Unknown',
      new Date(c.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      c.comment_text ?? '',
    ]
  })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function toTsv(rows: string[][]): string {
  const clean = (v: string) => v.replace(/[\t\r\n]+/g, ' ')
  return [HEADERS, ...rows].map((r) => r.map(clean).join('\t')).join('\n')
}

function toCsv(rows: string[][]): string {
  const quote = (v: string) => `"${v.replace(/"/g, '""')}"`
  return [HEADERS, ...rows].map((r) => r.map(quote).join(',')).join('\r\n')
}

function toHtml(rows: string[][]): string {
  const th = (v: string) =>
    `<th style="background:#f4f4f5;font-weight:bold;text-align:left;padding:6px 8px;border:1px solid #d4d4d8">${escapeHtml(v)}</th>`
  const td = (v: string) =>
    `<td style="padding:6px 8px;border:1px solid #e4e4e7;vertical-align:top">${escapeHtml(v)}</td>`
  const head = `<tr>${HEADERS.map(th).join('')}</tr>`
  const body = rows.map((r) => `<tr>${r.map(td).join('')}</tr>`).join('')
  return `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:10pt">${head}${body}</table>`
}

export async function copyCommentsForSheets(): Promise<number> {
  const rows = buildRows(await fetchAllComments())
  const tsv = toTsv(rows)
  const html = toHtml(rows)
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([tsv], { type: 'text/plain' }),
      }),
    ])
  } else {
    await navigator.clipboard.writeText(tsv)
  }
  return rows.length
}

export async function downloadCommentsCsv(): Promise<number> {
  const rows = buildRows(await fetchAllComments())
  const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dsp-candidate-comments-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return rows.length
}
