export type Sentiment =
  | 'very_negative'
  | 'slightly_negative'
  | 'neutral'
  | 'slightly_positive'
  | 'very_positive'

export const SENTIMENTS: { value: Sentiment; label: string }[] = [
  { value: 'very_negative', label: 'Very Negative' },
  { value: 'slightly_negative', label: 'Slightly Negative' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'slightly_positive', label: 'Slightly Positive' },
  { value: 'very_positive', label: 'Very Positive' },
]

export const SENTIMENT_COLORS: Record<Sentiment, { bg: string; text: string; ring: string }> = {
  very_negative: { bg: 'bg-red-600', text: 'text-red-700', ring: 'ring-red-600' },
  slightly_negative: { bg: 'bg-orange-500', text: 'text-orange-600', ring: 'ring-orange-500' },
  neutral: { bg: 'bg-zinc-400', text: 'text-zinc-600', ring: 'ring-zinc-400' },
  slightly_positive: { bg: 'bg-lime-500', text: 'text-lime-600', ring: 'ring-lime-500' },
  very_positive: { bg: 'bg-emerald-600', text: 'text-emerald-700', ring: 'ring-emerald-600' },
}

export const GRAD_QUARTERS = ['Fall', 'Winter', 'Spring', 'Summer'] as const
export type GradQuarter = (typeof GRAD_QUARTERS)[number]

export interface Candidate {
  id: string
  first_name: string
  last_name: string
  email: string | null
  major: string | null
  grad_year: number | null
  grad_quarter: GradQuarter | null
  photo_url: string | null
  created_at: string
}

export interface Submitter {
  id: string
  name: string
  active: boolean
  created_at: string
}

export interface Comment {
  id: string
  candidate_id: string
  submitter_id: string
  sentiment: Sentiment
  comment_text: string
  created_at: string
}

export interface CommentWithRelations extends Comment {
  candidates: Pick<Candidate, 'id' | 'first_name' | 'last_name'> | null
  submitters: Pick<Submitter, 'id' | 'name'> | null
}
