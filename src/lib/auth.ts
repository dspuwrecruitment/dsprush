export const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD ?? ''
export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? ''
export const RC_PASSWORD = import.meta.env.VITE_RC_PASSWORD ?? ''

const APP_KEY = 'dsprush_unlocked'
const ADMIN_KEY = 'dsprush_admin_unlocked'
const RC_KEY = 'dsprush_rc_unlocked'

export function isAppUnlocked(): boolean {
  return sessionStorage.getItem(APP_KEY) === '1'
}

export function unlockApp(): void {
  sessionStorage.setItem(APP_KEY, '1')
}

export function isAdminUnlocked(): boolean {
  return sessionStorage.getItem(ADMIN_KEY) === '1'
}

export function unlockAdmin(): void {
  sessionStorage.setItem(ADMIN_KEY, '1')
}

export function isRcUnlocked(): boolean {
  return sessionStorage.getItem(RC_KEY) === '1'
}

export function unlockRc(): void {
  sessionStorage.setItem(RC_KEY, '1')
}
