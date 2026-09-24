import { Link } from 'react-router-dom'

const ROLES = [
  { to: '/active', title: 'Active', description: 'Browse candidates and submit comments' },
  { to: '/rc', title: 'RC', description: 'Recruitment Committee: score assigned applications' },
  { to: '/admin', title: 'SVP', description: 'Manage rush, candidates, and results' },
]

export function RolePicker() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 px-6 safe-top safe-bottom">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-1">Delta Sigma Pi</p>
          <h1 className="text-2xl font-bold text-white">DSP Rush</h1>
          <p className="text-sm text-zinc-400 mt-1">Select your view</p>
        </div>
        <div className="flex flex-col gap-3">
          {ROLES.map((r) => (
            <Link
              key={r.to}
              to={r.to}
              className="bg-white rounded-xl border border-zinc-200 px-5 py-4 hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
            >
              <p className="text-base font-semibold text-zinc-900">{r.title}</p>
              <p className="text-sm text-zinc-500 mt-0.5">{r.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
