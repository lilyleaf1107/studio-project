import { useState, useRef } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  History,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Sparkles,
  Calendar,
  ListTodo,
  type LucideIcon
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
import Stats from './Stats'
import UsersPage from './Users'
import SettingsPage from './Settings'
import QuickTask from './QuickTask'
import ProjectDetail from './ProjectDetail'
import TaskDetail from './TaskDetail'
import SubProjectDetail from './SubProjectDetail'
import CalendarPage from './Calendar'
import TodayPage from './Today'
import { canManageSystem, canManageUsers, canViewAllProjects } from '@/lib/permissions'

type MenuItem = {
  to: string
  label: string
  icon: LucideIcon
  roles: string[]
  group: 'main' | 'admin'
}

const ORDER_KEY = 'sidebar-order'

const DEFAULT_MAIN_MENU: MenuItem[] = [
  { to: '/', label: '首页', icon: LayoutDashboard, roles: ['owner', 'admin', 'staff'], group: 'main' },
  { to: '/projects', label: '项目', icon: FolderKanban, roles: ['owner', 'admin', 'staff'], group: 'main' },
  { to: '/tasks', label: '任务中心', icon: CheckSquare, roles: ['owner', 'admin', 'staff'], group: 'main' },
  { to: '/calendar', label: '日历', icon: Calendar, roles: ['owner', 'admin', 'staff'], group: 'main' },
  { to: '/today', label: '每日待办', icon: ListTodo, roles: ['owner', 'admin', 'staff'], group: 'main' },
  { to: '/records', label: '工作记录', icon: History, roles: ['owner', 'admin', 'staff'], group: 'main' },
  { to: '/quick-task', label: '快速建任务', icon: Sparkles, roles: ['owner', 'admin'], group: 'main' }
]

const DEFAULT_ADMIN_MENU: MenuItem[] = [
  { to: '/stats', label: '数据统计', icon: BarChart3, roles: ['owner', 'admin'], group: 'admin' },
  { to: '/users', label: '账号管理', icon: Users, roles: ['admin', 'owner'], group: 'admin' },
  { to: '/settings', label: '系统设置', icon: Settings, roles: ['admin'], group: 'admin' }
]

function loadOrder(): Record<string, string[]> | null {
  try {
    const raw = localStorage.getItem(ORDER_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : null
  } catch {
    return null
  }
}

function saveOrder(main: string[], admin: string[]) {
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify({ main, admin }))
  } catch {
    // ignore
  }
}

function applyOrder(items: MenuItem[], order: string[] | undefined): MenuItem[] {
  if (!order || order.length === 0) return items
  const orderMap = new Map(order.map((to, i) => [to, i] as [string, number]))
  return [...items].sort(
    (a, b) =>
      (orderMap.get(a.to) ?? Number.MAX_SAFE_INTEGER) -
      (orderMap.get(b.to) ?? Number.MAX_SAFE_INTEGER)
  )
}

export default function DesktopLayout() {
  const profile = useAuthStore((s) => s.profile)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const canAll = canViewAllProjects(profile?.role)
  const isUserMgr = canManageUsers(profile?.role)
  const isSysMgr = canManageSystem(profile?.role)

  const initialOrder = loadOrder()
  const [mainMenu, setMainMenu] = useState<MenuItem[]>(() =>
    applyOrder(DEFAULT_MAIN_MENU, initialOrder?.main)
  )
  const [adminMenu, setAdminMenu] = useState<MenuItem[]>(() =>
    applyOrder(DEFAULT_ADMIN_MENU, initialOrder?.admin)
  )

  // 拖拽状态
  const dragIndex = useRef<number | null>(null)
  const dragGroup = useRef<'main' | 'admin' | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [overGroup, setOverGroup] = useState<'main' | 'admin' | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const showNav = (roles: string[]) => !profile || roles.includes(profile.role)

  async function handleLogout() {
    try {
      await logout()
      toast.success('已退出登录')
      navigate('/login', { replace: true })
    } catch (e: any) {
      toast.error(e?.message || '退出失败')
    }
  }

  function handleDragStart(group: 'main' | 'admin', index: number) {
    dragIndex.current = index
    dragGroup.current = group
    setIsDragging(true)
  }

  function handleDragOver(e: React.DragEvent, group: 'main' | 'admin', index: number) {
    e.preventDefault()
    if (dragGroup.current !== group) return
    setOverIndex(index)
    setOverGroup(group)
  }

  function handleDrop(group: 'main' | 'admin', index: number) {
    const fromIdx = dragIndex.current
    if (fromIdx === null || dragGroup.current !== group) {
      resetDrag()
      return
    }
    if (fromIdx === index) {
      resetDrag()
      return
    }

    const items = group === 'main' ? [...mainMenu] : [...adminMenu]
    // 只在可见项之间交换
    const visibleIndices = items
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => showNav(item.roles))

    const visibleFrom = visibleIndices[fromIdx]
    const visibleTo = visibleIndices[index]
    if (!visibleFrom || !visibleTo) {
      resetDrag()
      return
    }

    // 交换在原数组中的位置
    const realFrom = visibleFrom.i
    const realTo = visibleTo.i
    const temp = items[realFrom]
    items[realFrom] = items[realTo]
    items[realTo] = temp

    if (group === 'main') {
      setMainMenu(items)
      saveOrder(items.map((m) => m.to), adminMenu.map((m) => m.to))
    } else {
      setAdminMenu(items)
      saveOrder(mainMenu.map((m) => m.to), items.map((m) => m.to))
    }
    resetDrag()
  }

  function resetDrag() {
    dragIndex.current = null
    dragGroup.current = null
    setOverIndex(null)
    setOverGroup(null)
    setIsDragging(false)
  }

  function handleDragEnd() {
    resetDrag()
  }

  function renderGroup(items: MenuItem[], group: 'main' | 'admin') {
    const visible = items.filter((n) => showNav(n.roles))
    return visible.map((n, index) => {
      const isOver = overGroup === group && overIndex === index
      const isDraggingThis = isDragging && dragIndex.current === index && dragGroup.current === group
      return (
        <div
          key={n.to}
          draggable
          onDragStart={() => handleDragStart(group, index)}
          onDragOver={(e) => handleDragOver(e, group, index)}
          onDrop={(e) => { e.preventDefault(); handleDrop(group, index) }}
          onDragEnd={handleDragEnd}
          className={cn(
            'relative cursor-grab active:cursor-grabbing transition-opacity',
            isDraggingThis && 'opacity-40'
          )}
        >
          {/* 拖拽放置指示线 */}
          {isOver && (
            <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-blue-400 rounded-full z-10" />
          )}
          <NavLink
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 select-none',
                isActive
                  ? 'text-white shadow-sm'
                  : 'hover:!text-white [&:hover]:bg-[var(--sidebar-hover)]'
              )
            }
            style={({ isActive }) =>
              isActive
                ? { backgroundColor: 'var(--sidebar-active)' }
                : { color: 'var(--sidebar-text)' }
            }
          >
            <n.icon className="h-4.5 w-4.5 shrink-0" />
            <span className="flex-1 font-medium">{n.label}</span>
          </NavLink>
        </div>
      )
    })
  }

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside
        className="w-64 shrink-0 text-slate-100 flex flex-col min-h-screen sticky top-0 h-screen"
        style={{ backgroundColor: 'var(--sidebar-bg)' }}
      >
        <div className="p-5 border-b border-slate-700/50 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: 'var(--sidebar-active)' }}
            >
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold leading-tight text-base">工作室项目</div>
              <div className="text-xs text-slate-400">管理系统</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
          <div className="space-y-1">
            <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              主菜单
            </div>
            {renderGroup(mainMenu, 'main')}
          </div>

          <div className="space-y-1">
            <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              数据与管理
            </div>
            {renderGroup(adminMenu, 'admin')}
          </div>
        </nav>

        <div className="border-t border-slate-700/50 p-4 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, var(--sidebar-active), var(--sidebar-bg))' }}
            >
              {profile?.name?.slice(0, 1) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate text-white">{profile?.name || '未命名'}</div>
              <div className="text-xs text-slate-400">
                {profile?.role ? ROLE_LABELS[profile.role] : ''}
              </div>
              {profile?.job_title && (
                <div className="text-xs text-slate-400 mt-0.5">
                  身份卡：{profile.job_title}
                </div>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="p-6 max-w-7xl mx-auto">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="sub-projects/:id" element={<SubProjectDetail />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="tasks/:id" element={<TaskDetail />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="today" element={<TodayPage />} />
            <Route path="quick-task" element={<QuickTask />} />
            <Route path="records" element={<WorkRecords />} />
            <Route path="stats" element={<Stats />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
