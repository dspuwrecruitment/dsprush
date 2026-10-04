type IconProps = { className?: string }

export function SearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="9" r="6.5" />
      <path d="M17.5 17.5L13.8 13.8" strokeLinecap="round" />
    </svg>
  )
}

export function LeaderboardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <path d="M4 16.5V11M10 16.5V4M16 16.5V8.5" strokeLinecap="round" />
    </svg>
  )
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <path d="M5 5L15 15M15 5L5 15" strokeLinecap="round" />
    </svg>
  )
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} stroke="currentColor" strokeWidth="2">
      <path d="M4.5 10.5L8 14L15.5 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <path d="M12.5 15L7.5 10L12.5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="10" width="3.2" height="7" rx="0.5" />
      <rect x="8.4" y="6" width="3.2" height="11" rx="0.5" />
      <rect x="13.8" y="3" width="3.2" height="14" rx="0.5" />
    </svg>
  )
}

export function CommentIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4V16H6.5A2.5 2.5 0 0 1 4 13.5v-8z" strokeLinejoin="round" />
    </svg>
  )
}

export function ReelsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="2.5" width="14" height="15" rx="2.5" />
      <path d="M8.5 7.5L12.5 10L8.5 12.5V7.5z" strokeLinejoin="round" />
    </svg>
  )
}
