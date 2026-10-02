import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { SearchView } from './SearchView'
import { LeaderboardView } from './LeaderboardView'
import { MetricsView } from './MetricsView'
import { CANDIDATE_LISTS, type CandidateList } from '../lib/types'

export function MainApp() {
  const [listKey, setListKey] = useState<CandidateList | null>(null)
  const [tab, setTab] = useState<'search' | 'metrics' | 'leaderboard'>('search')
  const [refreshKey, setRefreshKey] = useState(0)

  if (!listKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 px-6 safe-top safe-bottom">
        <div className="w-full max-w-sm flex flex-col gap-6">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-1">Delta Sigma Pi</p>
            <h1 className="text-2xl font-bold text-white">DSP Rush</h1>
            <p className="text-sm text-zinc-400 mt-1">Which group do you want to view?</p>
          </div>
          <div className="flex flex-col gap-3">
            {CANDIDATE_LISTS.map((l) => (
              <button
                key={l.key}
                onClick={() => setListKey(l.key)}
                className="bg-white rounded-xl border border-zinc-200 px-5 py-4 text-left hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
              >
                <p className="text-base font-semibold text-zinc-900">{l.label}</p>
              </button>
            ))}
          </div>
          <Link to="/" className="text-center text-sm text-zinc-500 hover:text-zinc-300">
            Switch role
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {tab === 'search' && (
        <SearchView
          listKey={listKey}
          onSwitchList={() => setListKey(null)}
          onCommentSubmitted={() => setRefreshKey((k) => k + 1)}
        />
      )}
      {tab === 'metrics' && <MetricsView />}
      {tab === 'leaderboard' && <LeaderboardView listKey={listKey} refreshKey={refreshKey} />}
      <BottomNav tab={tab} onChange={setTab} />
    </div>
  )
}
