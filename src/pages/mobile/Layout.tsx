import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  User,
  FolderKanban
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
import Projects from './Projects'
import ProjectDetail from './ProjectDetail'
import SubProjectDetail from './SubProjectDetail'
import SchedulePage from './Schedule'
import Stats from './Stats'
import UsersPage from './Users'

export default function MobileLayout() {
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
    { to: '/projects', label: '项目', icon: FolderKanban },
    { to: '/tasks', label: '任务', icon: CheckSquare },
    { to: '/schedule', label: '日程', icon: CalendarDays },
    { to: '/profile', label: '我的', icon: User }
  ]

  return (
    <div className="min-h-screen flex flex-col bg-muted/20 pb-16">
      <main className="flex-1 min-w-0">
        <div className="p-3">
          <Routes>
            <Route index element={<Home />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="sub-projects/:id" element={<SubProjectDetail />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="tasks/:id" element={<TaskDetail />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="records" element={<WorkRecords />} />
            <Route path="stats" element={<Stats />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>

      {/* 底部Tab */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur-md z-40">
        <div className="grid grid-cols-5 max-w-md mx-auto">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors',
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
