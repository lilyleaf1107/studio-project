import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogOut, Settings as SettingsIcon, User as UserIcon } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { ROLE_LABELS } from '@/lib/settings'
import { canManageSystem } from '@/lib/permissions'
import { Link } from 'react-router-dom'

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

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
              {profile?.name?.slice(0, 1) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold truncate">{profile?.name || '未命名用户'}</div>
              <div className="text-sm text-muted-foreground mt-0.5">
                {profile?.email || '-'}
              </div>
              <div className="mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">
                  {profile?.role ? ROLE_LABELS[profile.role] : ''}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {canManageSystem(profile?.role) && (
          <Link to="/settings">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <SettingsIcon className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 font-medium">系统设置</span>
                <span className="text-muted-foreground">›</span>
              </CardContent>
            </Card>
          </Link>
        )}
        <Card>
          <CardContent className="p-4 flex items-center gap-3 opacity-60">
            <UserIcon className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1 font-medium">修改密码</span>
            <span className="text-xs text-muted-foreground">后续支持</span>
          </CardContent>
        </Card>
      </div>

      <Button variant="destructive" className="w-full gap-2" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
        退出登录
      </Button>
    </div>
  )
}
