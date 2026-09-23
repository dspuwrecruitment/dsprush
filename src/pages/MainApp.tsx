import { useState } from 'react'
import { BottomNav } from '../components/BottomNav'
import { SearchView } from './SearchView'
import { LeaderboardView } from './LeaderboardView'

export function MainApp() {
  const [tab, setTab] = useState<'search' | 'leaderboard'>('search')
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="min-h-screen bg-zinc-50">
      {tab === 'search' && (
        <SearchView onCommentSubmitted={() => setRefreshKey((k) => k + 1)} />
      )}
      {tab === 'leaderboard' && <LeaderboardView refreshKey={refreshKey} />}
      <BottomNav tab={tab} onChange={setTab} />
    </div>
  )
}
