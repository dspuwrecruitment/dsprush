import { HashRouter, Routes, Route } from 'react-router-dom'
import { PasswordGate } from './components/PasswordGate'
import { MainApp } from './pages/MainApp'
import { AdminApp } from './pages/AdminApp'
import { RolePicker } from './pages/RolePicker'
import { RcApp } from './pages/rc/RcApp'
import {
  APP_PASSWORD,
  ADMIN_PASSWORD,
  RC_PASSWORD,
  isAppUnlocked,
  unlockApp,
  isAdminUnlocked,
  unlockAdmin,
  isRcUnlocked,
  unlockRc,
} from './lib/auth'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<RolePicker />} />
        <Route
          path="/active"
          element={
            <PasswordGate
              key="app-gate"
              title="DSP Rush"
              subtitle="Enter the access code to continue"
              correctPassword={APP_PASSWORD}
              isUnlocked={isAppUnlocked}
              onUnlock={unlockApp}
            >
              <MainApp />
            </PasswordGate>
          }
        />
        <Route
          path="/rc"
          element={
            <PasswordGate
              key="rc-gate"
              title="Recruitment Committee"
              subtitle="Enter the RC access code"
              correctPassword={RC_PASSWORD}
              isUnlocked={isRcUnlocked}
              onUnlock={unlockRc}
            >
              <RcApp />
            </PasswordGate>
          }
        />
        <Route
          path="/admin"
          element={
            <PasswordGate
              key="admin-gate"
              title="SVP View"
              subtitle="Admin access only"
              correctPassword={ADMIN_PASSWORD}
              isUnlocked={isAdminUnlocked}
              onUnlock={unlockAdmin}
            >
              <AdminApp />
            </PasswordGate>
          }
        />
      </Routes>
    </HashRouter>
  )
}
