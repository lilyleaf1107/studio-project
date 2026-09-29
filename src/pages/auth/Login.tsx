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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'hsl(var(--background))' }}>
      <Card className="w-full max-w-md p-8">
        {/* 档案编号头 */}
        <div className="flex items-center justify-between mb-6 pb-3 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          <span className="font-mono-archive text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
            FILE NO. {mode === 'login' ? '001' : '002'} / {mode === 'login' ? 'LOGIN' : 'REGISTER'}
          </span>
          <span className="font-mono-archive text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
            ARCHIVE
          </span>
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center mb-4 font-mono-archive font-bold text-xl" style={{ backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
            档
          </div>
          <h1 className="text-2xl font-bold tracking-tight">工作室项目管理</h1>
          <p className="text-sm text-muted-foreground mt-2 font-mono-archive">
            {mode === 'login' ? '— 登录系统 —' : '— 注册账号 —'}
          </p>
        </div>

        {/* 邮箱/手机号 切换 */}
        <div className="flex gap-2 mb-4 p-1 rounded-md" style={{ backgroundColor: 'hsl(var(--muted))' }}>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              loginType === 'phone' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
            }`}
            onClick={() => { setLoginType('phone'); setIdentifier('') }}
          >
            手机号
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              loginType === 'email' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
            }`}
            onClick={() => { setLoginType('email'); setIdentifier('') }}
          >
            邮箱
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-2">
              <Label className="font-mono-archive text-xs">姓名</Label>
              <Input
                placeholder="请输入您的姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="font-mono-archive text-xs">{loginType === 'phone' ? '手机号' : '邮箱'}</Label>
            {loginType === 'phone' ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground px-3 py-2 rounded-md whitespace-nowrap font-mono-archive" style={{ backgroundColor: 'hsl(var(--muted))' }}>+86</span>
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
            <Label className="font-mono-archive text-xs">密码</Label>
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
