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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-950 via-indigo-900 to-zinc-900 px-6 safe-top safe-bottom">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8 flex flex-col gap-5"
      >
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl mb-2">
            ΔΣΦ
          </div>
          <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
          {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <input
            type="password"
            inputMode="text"
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError(false)
            }}
            placeholder="Password"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {error && <p className="text-sm text-red-600 px-1">Incorrect password, try again.</p>}
        </div>
        <button
          type="submit"
          className="w-full rounded-xl bg-indigo-600 py-3 text-white font-medium active:bg-indigo-700 transition-colors"
        >
          Enter
        </button>
      </form>
    </div>
  )
}
