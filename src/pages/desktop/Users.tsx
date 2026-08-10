import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, UserX, ShieldAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { ROLE_LABELS } from '@/lib/settings'
import { formatDateTime } from '@/lib/utils'
import type { Profile, UserRole } from '@/types'

interface ProfileRow extends Profile {
  email?: string
}

export default function UsersPage() {
  const profile = useAuthStore((s) => s.profile)
  const qc = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' as UserRole })
  const [submitting, setSubmitting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['users-list'],
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data: profiles, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return profiles as ProfileRow[]
    }
  })

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('角色已更新')
      qc.invalidateQueries({ queryKey: ['users-list'] })
    },
    onError: (e: any) => toast.error(e?.message || '更新失败')
  })

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) {
      toast.error('请完整填写（密码至少 6 位）')
      return
    }
    setSubmitting(true)
    try {
      // 通过 admin 接口创建用户（需要 service_role，这里走前端 signup 需要邮箱验证）
      // 为简化使用，使用 Supabase 的管理员方式：先 signUp，成功后更新 role
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name: form.name } }
      })
      if (error) throw error
      if (!data.user) throw new Error('创建失败')

      // 更新角色
      const { error: roleErr } = await supabase
        .from('profiles')
        .update({ role: form.role })
        .eq('id', data.user.id)
      if (roleErr) console.warn('角色更新失败，可在列表中手动设置', roleErr)

      // 登出刚刚创建的临时会话，恢复当前用户
      await supabase.auth.signOut()
      // 重新登录当前用户 —— 这里通过 reload 让用户重新登录更安全
      toast.success('账号已创建，系统需要您重新登录')
      setTimeout(() => window.location.reload(), 1200)

      setInviteOpen(false)
      setForm({ name: '', email: '', password: '', role: 'staff' })
    } catch (e: any) {
      toast.error(e?.message || '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">账号管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理员工账号和角色权限（共 {data?.length || 0} 个账号）
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />新增员工账号</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增员工账号</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label>姓名</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例如：张三" required />
              </div>
              <div className="space-y-2">
                <Label>邮箱（登录用）</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="zhangsan@example.com" required />
              </div>
              <div className="space-y-2">
                <Label>初始密码（至少 6 位）</Label>
                <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="建议 123456 或随机" minLength={6} required />
              </div>
              <div className="space-y-2">
                <Label>角色</Label>
                <Select value={form.role} onValueChange={(v: UserRole) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">老板</SelectItem>
                    <SelectItem value="admin">管理员</SelectItem>
                    <SelectItem value="staff">员工</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>取消</Button>
                <Button type="submit" disabled={submitting}>{submitting ? '创建中...' : '创建账号'}</Button>
              </DialogFooter>
            </form>
            <p className="text-xs text-muted-foreground border-t pt-3">
              <ShieldAlert className="h-3.5 w-3.5 inline mr-1" />
              注意：创建后系统会让您重新登录，这是为了保证账号安全。
            </p>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">账号列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-40 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">加载中...</TableCell></TableRow>
              )}
              {!isLoading && data?.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">暂无账号</TableCell></TableRow>
              )}
              {data?.map((p) => {
                const isSelf = p.id === profile?.id
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                          {p.name?.slice(0, 1)}
                        </div>
                        {p.name}
                        {isSelf && <span className="text-xs text-muted-foreground">（我）</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.email || '-'}</TableCell>
                    <TableCell>
                      <Select
                        defaultValue={p.role}
                        disabled={isSelf}
                        onValueChange={(v: UserRole) => updateRoleMutation.mutate({ id: p.id, role: v })}
                      >
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">{ROLE_LABELS.owner}</SelectItem>
                          <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                          <SelectItem value="staff">{ROLE_LABELS.staff}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatDateTime(p.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-red-500 gap-1" disabled={isSelf}>
                        <UserX className="h-3.5 w-3.5" />
                        停用
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">权限说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div><strong className="text-foreground">老板：</strong>查看所有项目、任务、工作记录和数据统计，可验收任务。</div>
          <div><strong className="text-foreground">管理员：</strong>拥有老板全部权限，另可管理账号、角色、任务模板、系统设置。</div>
          <div><strong className="text-foreground">员工：</strong>只能查看和操作分配给自己的任务、自己参与的项目和自己的工作记录。</div>
        </CardContent>
      </Card>
    </div>
  )
}
