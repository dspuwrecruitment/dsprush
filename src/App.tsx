import { HashRouter, Routes, Route } from 'react-router-dom'
import { PasswordGate } from './components/PasswordGate'
import { MainApp } from './pages/MainApp'
import { AdminApp } from './pages/AdminApp'
import { APP_PASSWORD, ADMIN_PASSWORD, isAppUnlocked, unlockApp, isAdminUnlocked, unlockAdmin } from './lib/auth'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route
          path="/"
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
