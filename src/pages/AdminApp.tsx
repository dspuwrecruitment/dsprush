import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SubmittersTab } from './admin/SubmittersTab'
import { CandidatesTab } from './admin/CandidatesTab'
import { CommentsTab } from './admin/CommentsTab'
import { RcMembersTab } from './admin/RcMembersTab'
import { LeaderboardTab } from './admin/LeaderboardTab'
import { ChevronLeftIcon } from '../components/icons'

type Tab = 'candidates' | 'rc' | 'leaderboard' | 'submitters' | 'comments'

export function AdminApp() {
  const [tab, setTab] = useState<Tab>('candidates')

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-medium">DSP Rush</p>
            <h1 className="text-xl font-bold text-zinc-900">SVP View</h1>
          </div>
          <Link to="/" className="flex items-center gap-1 text-sm text-indigo-600 font-medium hover:text-indigo-700">
            <ChevronLeftIcon className="w-4 h-4" />
            Switch role
          </Link>
        </div>
        <nav className="max-w-5xl mx-auto flex gap-1 mt-4">
          <TabButton label="Candidates" active={tab === 'candidates'} onClick={() => setTab('candidates')} />
          <TabButton label="RC Members" active={tab === 'rc'} onClick={() => setTab('rc')} />
          <TabButton label="Leaderboard" active={tab === 'leaderboard'} onClick={() => setTab('leaderboard')} />
          <TabButton label="Submitters" active={tab === 'submitters'} onClick={() => setTab('submitters')} />
          <TabButton label="Comments" active={tab === 'comments'} onClick={() => setTab('comments')} />
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {tab === 'candidates' && <CandidatesTab />}
        {tab === 'rc' && <RcMembersTab />}
        {tab === 'leaderboard' && <LeaderboardTab />}
        {tab === 'submitters' && <SubmittersTab />}
        {tab === 'comments' && <CommentsTab />}
      </main>
    </div>
  )
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
        active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-zinc-500'
      }`}
    >
      {label}
    </button>
  )
}
