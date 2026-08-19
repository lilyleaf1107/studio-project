import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Login from '@/pages/auth/Login'
import DesktopLayout from '@/pages/desktop/Layout'
import MobileLayout from '@/pages/mobile/Layout'
import { useAuthStore } from '@/store/auth'
import { useThemeStore } from '@/store/theme'
import { useDevice } from '@/hooks/useDevice'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { isMobile } = useDevice()
  const initAuth = useAuthStore((s) => s.init)
  const initTheme = useThemeStore((s) => s.init)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initTheme()
    initAuth().finally(() => setReady(true))
  }, [initAuth, initTheme])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">启动中...</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <RequireAuth>{isMobile ? <MobileLayout /> : <DesktopLayout />}</RequireAuth>
        }
      />
    </Routes>
  )
}
