import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  LogOut,
  Settings as SettingsIcon,
  CalendarDays,
  BarChart3,
  Users as UsersIcon,
  ChevronRight
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { ROLE_LABELS } from '@/lib/settings'
import { canViewUsers, canViewAllProjects } from '@/lib/permissions'

export default function Profile() {
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

  const menuItems = [
    { to: '/schedule', label: '日历', icon: CalendarDays, show: true },
    { to: '/stats', label: '数据统计', icon: BarChart3, show: canViewAllProjects(profile?.role) },
    { to: '/users', label: '账号管理', icon: UsersIcon, show: canViewUsers(profile?.role) }
  ].filter((m) => m.show)

  return (
    <div className="space-y-4">
      {/* 个人信息卡 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold">
              {profile?.name?.slice(0, 1) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-semibold truncate">{profile?.name || '未命名用户'}</div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">{profile?.email || '-'}</div>
              <div className="mt-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary">
                  {profile?.role ? ROLE_LABELS[profile.role] : ''}
                </span>
                {profile?.job_title && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary ml-1">
                    {profile.job_title}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 功能菜单 */}
      <div className="space-y-1.5">
        {menuItems.map((m) => (
          <Link key={m.to} to={m.to}>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                  <m.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="flex-1 font-medium text-sm">{m.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}

        {/* 系统设置（所有人可见，权限内部控制） */}
        <Link to="/settings">
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                <SettingsIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="flex-1 font-medium text-sm">系统设置</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <Button variant="destructive" className="w-full gap-2" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
        退出登录
      </Button>
    </div>
  )
}
