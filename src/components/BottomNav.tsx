import { LeaderboardIcon, SearchIcon } from './icons'

interface BottomNavProps {
  tab: 'search' | 'leaderboard'
  onChange: (tab: 'search' | 'leaderboard') => void
}

export function BottomNav({ tab, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-zinc-200 safe-bottom z-30">
      <div className="max-w-lg mx-auto flex">
        <NavButton
          label="Search"
          icon={SearchIcon}
          active={tab === 'search'}
          onClick={() => onChange('search')}
        />
        <NavButton
          label="Leaderboard"
          icon={LeaderboardIcon}
          active={tab === 'leaderboard'}
          onClick={() => onChange('leaderboard')}
        />
      </div>
    </nav>
  )
}

function NavButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string
  icon: (props: { className?: string }) => React.JSX.Element
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
        active ? 'text-indigo-600' : 'text-zinc-400'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  )
}
