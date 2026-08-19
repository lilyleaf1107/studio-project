import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth'
import { Briefcase } from 'lucide-react'

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loginType, setLoginType] = useState<'email' | 'phone'>('phone')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  if (user) {
    navigate('/', { replace: true })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(identifier, password)
        toast.success('登录成功')
      } else {
        if (!name.trim()) {
          toast.error('请填写姓名')
          return
        }
        if (loginType === 'phone' && !/^\d{11}$/.test(identifier.replace(/\s/g, ''))) {
          toast.error('请输入正确的 11 位手机号')
          return
        }
        await register(name.trim(), identifier, password, loginType === 'phone')
        toast.success('注册成功，请登录')
        setMode('login')
        setPassword('')
      }
    } catch (err: any) {
      toast.error(err?.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50/40 to-teal-50/30">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <Briefcase className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">工作室项目管理</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === 'login' ? '使用账号登录系统' : '注册一个新账号'}
          </p>
        </div>

        {/* 邮箱/手机号 切换 */}
        <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              loginType === 'phone' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'
            }`}
            onClick={() => { setLoginType('phone'); setIdentifier('') }}
          >
            手机号
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              loginType === 'email' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground'
            }`}
            onClick={() => { setLoginType('email'); setIdentifier('') }}
          >
            邮箱
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-2">
              <Label>姓名</Label>
              <Input
                placeholder="请输入您的姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>{loginType === 'phone' ? '手机号' : '邮箱'}</Label>
            {loginType === 'phone' ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground px-3 py-2 bg-slate-100 rounded-md whitespace-nowrap">+86</span>
                <Input
                  type="tel"
                  placeholder="请输入 11 位手机号"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  autoComplete="tel"
                  required
                  className="flex-1"
                />
              </div>
            ) : (
              <Input
                type="email"
                placeholder="your@email.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="email"
                required
              />
            )}
          </div>
          <div className="space-y-2">
            <Label>密码</Label>
            <Input
              type="password"
              placeholder="至少 6 位"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册账号'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setPassword('')
            }}
          >
            {mode === 'login' ? '没有账号？立即注册' : '已有账号？去登录'}
          </button>
        </div>
      </Card>
    </div>
  )
}
