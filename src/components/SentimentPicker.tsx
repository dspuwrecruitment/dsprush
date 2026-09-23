import { SENTIMENTS, SENTIMENT_COLORS, type Sentiment } from '../lib/types'

interface SentimentPickerProps {
  value: Sentiment | null
  onChange: (value: Sentiment) => void
}

export function SentimentPicker({ value, onChange }: SentimentPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SENTIMENTS.map((s) => {
        const active = value === s.value
        const colors = SENTIMENT_COLORS[s.value]
        return (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange(s.value)}
            className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${
              active
                ? `${colors.bg} text-white border-transparent shadow-sm`
                : 'bg-white text-zinc-600 border-zinc-200 active:bg-zinc-50'
            }`}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}
