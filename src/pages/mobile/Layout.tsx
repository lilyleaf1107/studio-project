import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CheckSquare,
  History,
  User,
  LogOut
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Home from './Home'
import Tasks from './Tasks'
import WorkRecords from './WorkRecords'
import Profile from './Profile'
import TaskDetail from './TaskDetail'
import SettingsPage from './Settings'
import { canManageSystem } from '@/lib/permissions'
import { Button } from '@/components/ui/button'

export default function MobileLayout() {
  const profile = useAuthStore((s) => s.profile)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await logout()
      toast.success('已退出登录')
      navigate('/login', { replace: true })
    } catch (e: any) {
      toast.error(e?.message || '退出失败')
    }
  }

  const tabs = [
    { to: '/', label: '首页', icon: LayoutDashboard, end: true },
    { to: '/tasks', label: '我的任务', icon: CheckSquare },
    { to: '/records', label: '工作记录', icon: History },
    { to: '/profile', label: '我的', icon: User }
  ]

  return (
    <div className="min-h-screen flex flex-col bg-muted/20 pb-20">
      <main className="flex-1 min-w-0">
        <div className="p-4">
          <Routes>
            <Route index element={<Home />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="tasks/:id" element={<TaskDetail />} />
            <Route path="records" element={<WorkRecords />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>

      {/* 底部Tab */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur-md z-40">
        <div className="grid grid-cols-4 max-w-md mx-auto">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 py-2.5 text-xs transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )
              }
            >
              <t.icon className="h-5 w-5" />
              <span>{t.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
