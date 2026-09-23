export const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD ?? ''
export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? ''

const APP_KEY = 'dsprush_unlocked'
const ADMIN_KEY = 'dsprush_admin_unlocked'

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
