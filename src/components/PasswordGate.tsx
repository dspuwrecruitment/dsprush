import { useState, type FormEvent, type ReactNode } from 'react'

interface PasswordGateProps {
  title: string
  subtitle?: string
  correctPassword: string
  isUnlocked: () => boolean
  onUnlock: () => void
  children: ReactNode
}

export function PasswordGate({
  title,
  subtitle,
  correctPassword,
  isUnlocked,
  onUnlock,
  children,
}: PasswordGateProps) {
  const [unlocked, setUnlocked] = useState(isUnlocked)
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (correctPassword && value === correctPassword) {
      onUnlock()
      setUnlocked(true)
    } else {
      setError(true)
    }
  }

  if (unlocked) return <>{children}</>

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 px-6 safe-top safe-bottom">
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-1">Delta Sigma Pi</p>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>}
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-700">Password</label>
            <input
              type="password"
              inputMode="text"
              autoFocus
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setError(false)
              }}
              className="w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-base text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            />
            {error && <p className="text-sm text-red-600">Incorrect password, try again.</p>}
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-white font-medium hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
          >
            Enter
          </button>
        </div>
      </form>
    </div>
  )
}
