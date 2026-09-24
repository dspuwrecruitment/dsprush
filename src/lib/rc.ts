import { supabase } from './supabase'
import type { GradQuarter, RcMember, SummaryItem } from './types'
import { GRAD_QUARTERS } from './types'

export const REVIEWERS_PER_CANDIDATE = 3
export const CUT_LINE_LIMIT = 60

export async function fetchActiveMembers(): Promise<RcMember[]> {
  const { data } = await supabase.from('rc_members').select('*').is('removed_at', null).order('name')
  return data ?? []
}

export async function fetchLoads(members: RcMember[]): Promise<Map<string, number>> {
  const counts = await Promise.all(
    members.map(async (m) => {
      const { count } = await supabase
        .from('review_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('rc_member_id', m.id)
      return [m.id, count ?? 0] as const
    }),
  )
  return new Map(counts)
}

function shuffled<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pickLightest(members: RcMember[], loads: Map<string, number>, n = REVIEWERS_PER_CANDIDATE): string[] {
  return shuffled(members)
    .sort((a, b) => (loads.get(a.id) ?? 0) - (loads.get(b.id) ?? 0))
    .slice(0, n)
    .map((m) => m.id)
}

export interface AssignmentRow {
  candidate_id: string
  rc_member_id: string
}

export function planAssignments(candidateIds: string[], members: RcMember[], loads: Map<string, number>): AssignmentRow[] {
  const current = new Map(loads)
  const rows: AssignmentRow[] = []
  for (const candidateId of candidateIds) {
    for (const memberId of pickLightest(members, current)) {
      current.set(memberId, (current.get(memberId) ?? 0) + 1)
      rows.push({ candidate_id: candidateId, rc_member_id: memberId })
    }
  }
  return rows
}

export async function insertAssignments(rows: AssignmentRow[]): Promise<string | null> {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('review_assignments').insert(rows.slice(i, i + 500))
    if (error) return error.message
  }
  return null
}

export async function getNextNumber(): Promise<number> {
  const { data } = await supabase
    .from('candidates')
    .select('number')
    .not('number', 'is', null)
    .order('number', { ascending: false })
    .limit(1)
  return (data?.[0]?.number ?? 0) + 1
}

export async function getNextRankOrder(): Promise<number | null> {
  const { data: state } = await supabase.from('ranking_state').select('locked_at').eq('id', 1).single()
  if (!state?.locked_at) return null
  const { data } = await supabase
    .from('candidates')
    .select('rank_order')
    .not('rank_order', 'is', null)
    .order('rank_order', { ascending: false })
    .limit(1)
  return (data?.[0]?.rank_order ?? 0) + 1
}

export function normalizeQuarter(raw: string | null | undefined): GradQuarter | null {
  const q = (raw ?? '').trim().toLowerCase()
  return GRAD_QUARTERS.find((g) => g.toLowerCase() === q) ?? null
}

export function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export function buildSummaryItems(c: {
  major?: string | null
  grad_year?: number | null
  grad_quarter?: string | null
  summary?: SummaryItem[]
}): SummaryItem[] {
  const items: SummaryItem[] = []
  if (c.major) items.push({ label: 'Major', value: c.major })
  const grad = [c.grad_quarter, c.grad_year].filter(Boolean).join(' ')
  if (grad) items.push({ label: 'Graduation', value: grad })
  return [...items, ...(c.summary ?? [])]
}
