import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  History,
  Database,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { ROLE_LABELS } from '@/lib/settings'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Dashboard from './Dashboard'
import Projects from './Projects'
import Tasks from './Tasks'
import WorkRecords from './WorkRecords'
import Files from './Files'
import Stats from './Stats'
import UsersPage from './Users'
import SettingsPage from './Settings'
import QuickTask from './QuickTask'
import ProjectDetail from './ProjectDetail'
import TaskDetail from './TaskDetail'
import SubProjectDetail from './SubProjectDetail'
import { canManageSystem, canManageUsers, canViewAllProjects } from '@/lib/permissions'

export default function DesktopLayout() {
  const profile = useAuthStore((s) => s.profile)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const canAll = canViewAllProjects(profile?.role)
  const isUserMgr = canManageUsers(profile?.role)
  const isSysMgr = canManageSystem(profile?.role)

  async function handleLogout() {
    try {
      await logout()
      toast.success('已退出登录')
      navigate('/login', { replace: true })
    } catch (e: any) {
      toast.error(e?.message || '退出失败')
    }
  }

  const nav = [
    { to: '/', label: '首页仪表盘', icon: LayoutDashboard, roles: ['owner', 'admin', 'staff'] },
    { to: '/projects', label: '大项目', icon: FolderKanban, roles: ['owner', 'admin', 'staff'] },
    { to: '/tasks', label: '任务中心', icon: CheckSquare, roles: ['owner', 'admin', 'staff'] },
    { to: '/quick-task', label: '快速建任务', icon: Sparkles, roles: ['owner', 'admin'] },
    { to: '/records', label: '工作记录', icon: History, roles: ['owner', 'admin', 'staff'] },
    { to: '/files', label: '文件资料库', icon: Database, roles: ['owner', 'admin', 'staff'] },
    { to: '/stats', label: '数据统计', icon: BarChart3, roles: ['owner', 'admin'] }
  ]
  const bottomNav = [
    { to: '/users', label: '账号管理', icon: Users, roles: ['admin'] },
    { to: '/settings', label: '系统设置', icon: Settings, roles: ['admin'] }
  ]

  const showNav = (roles: string[]) => !profile || roles.includes(profile.role)

  return (
    <div className="min-h-screen flex bg-muted/20">
      {/* 侧边栏 */}
      <aside className="w-60 shrink-0 border-r bg-card flex flex-col min-h-screen sticky top-0 h-screen">
        <div className="p-5 border-b">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold leading-tight">工作室项目</div>
              <div className="text-xs text-muted-foreground">管理系统</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.filter((n) => showNav(n.roles)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors group',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )
              }
            >
              <n.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{n.label}</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-0 group-[.active]:opacity-100" />
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-3 space-y-1">
          {bottomNav.filter((n) => showNav(n.roles)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )
              }
            >
              <n.icon className="h-4 w-4" />
              <span className="flex-1">{n.label}</span>
            </NavLink>
          ))}
        </div>

        {/* 用户信息 */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold">
              {profile?.name?.slice(0, 1) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{profile?.name || '未命名'}</div>
              <div className="text-xs text-muted-foreground">
                {profile?.role ? ROLE_LABELS[profile.role] : ''}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" />
            退出登录
          </Button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 min-w-0">
        <div className="p-6 max-w-7xl mx-auto">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="sub-projects/:id" element={<SubProjectDetail />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="tasks/:id" element={<TaskDetail />} />
            <Route path="quick-task" element={<QuickTask />} />
            <Route path="records" element={<WorkRecords />} />
            <Route path="files" element={<Files />} />
            <Route path="stats" element={<Stats />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
