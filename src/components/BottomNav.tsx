interface BottomNavProps {
  tab: 'search' | 'leaderboard'
  onChange: (tab: 'search' | 'leaderboard') => void
}

export function BottomNav({ tab, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-zinc-100 safe-bottom z-30">
      <div className="max-w-lg mx-auto flex">
        <NavButton label="Search" icon="🔍" active={tab === 'search'} onClick={() => onChange('search')} />
        <NavButton
          label="Leaderboard"
          icon="🏆"
          active={tab === 'leaderboard'}
          onClick={() => onChange('leaderboard')}
        />
      </div>
    </nav>
  )
}

function NavButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string
  icon: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
        active ? 'text-indigo-600' : 'text-zinc-400'
      }`}
    >
      <span className="text-lg leading-none">{icon}</span>
      {label}
    </button>
  )
}
