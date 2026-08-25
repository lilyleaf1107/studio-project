import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, UserX, ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { ROLE_LABELS, JOB_TITLE_PRESETS } from '@/lib/settings'
import { canManageUsers, canEditJobTitle } from '@/lib/permissions'
import { formatDateTime } from '@/lib/utils'
import type { Profile, UserRole } from '@/types'

interface ProfileRow extends Profile {
  email?: string
}

export default function UsersPage() {
  const profile = useAuthStore((s) => s.profile)
  const qc = useQueryClient()
  const isAdmin = canManageUsers(profile?.role)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' as UserRole, job_title: '' })
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

  const updateJobTitleMutation = useMutation({
    mutationFn: async ({ id, job_title }: { id: string; job_title: string }) => {
      const { error } = await supabase.from('profiles').update({ job_title }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('身份卡已更新')
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
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name: form.name } }
      })
      if (error) throw error
      if (!data.user) throw new Error('创建失败')

      const updateData: any = { role: form.role }
      if (form.job_title) updateData.job_title = form.job_title
      await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', data.user.id)

      await supabase.auth.signOut()
      toast.success('账号已创建，系统需要您重新登录')
      setTimeout(() => window.location.reload(), 1200)

      setInviteOpen(false)
      setForm({ name: '', email: '', password: '', role: 'staff', job_title: '' })
    } catch (e: any) {
      toast.error(e?.message || '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">账号管理</h1>
          <p className="text-xs text-muted-foreground mt-0.5">共 {data?.length || 0} 个</p>
        </div>
        {isAdmin && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />新增</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>新增员工账号</DialogTitle></DialogHeader>
              <form onSubmit={handleInvite} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">昵称</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">邮箱（登录用）</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">初始密码（至少 6 位）</Label>
                  <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">角色</Label>
                    <Select value={form.role} onValueChange={(v: UserRole) => setForm({ ...form, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">老板</SelectItem>
                        <SelectItem value="admin">经理</SelectItem>
                        <SelectItem value="partner">伙伴</SelectItem>
                        <SelectItem value="staff">员工</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">身份卡</Label>
                    <Select value={form.job_title} onValueChange={(v) => setForm({ ...form, job_title: v })}>
                      <SelectTrigger><SelectValue placeholder="可选" /></SelectTrigger>
                      <SelectContent>
                        {JOB_TITLE_PRESETS.map((jt) => (
                          <SelectItem key={jt} value={jt}>{jt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>取消</Button>
                  <Button type="submit" disabled={submitting}>{submitting ? '创建中...' : '创建账号'}</Button>
                </DialogFooter>
              </form>
              <p className="text-[10px] text-muted-foreground border-t pt-2 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3 shrink-0" />
                创建后系统会让您重新登录
              </p>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">加载中...</div>
      ) : data?.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">暂无账号</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data?.map((p) => {
            const isSelf = p.id === profile?.id
            return (
              <Card key={p.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                      {p.name?.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm truncate">{p.name}</span>
                        {isSelf && <span className="text-[10px] text-muted-foreground">（我）</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">{p.email || '-'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1">角色</div>
                      <Select
                        defaultValue={p.role}
                        disabled={isSelf || !isAdmin || (profile?.role === 'owner' && p.role === 'admin')}
                        onValueChange={(v: UserRole) => updateRoleMutation.mutate({ id: p.id, role: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">{ROLE_LABELS.owner}</SelectItem>
                          <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                          <SelectItem value="partner">{ROLE_LABELS.partner}</SelectItem>
                          <SelectItem value="staff">{ROLE_LABELS.staff}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1">身份卡</div>
                      <Select
                        defaultValue={p.job_title || ''}
                        disabled={!canEditJobTitle(profile?.role, p.role, isSelf)}
                        onValueChange={(v) => updateJobTitleMutation.mutate({ id: p.id, job_title: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {JOB_TITLE_PRESETS.map((jt) => (
                            <SelectItem key={jt} value={jt}>{jt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{formatDateTime(p.created_at)}</span>
                    <Button variant="ghost" size="sm" className="text-red-500 h-7 gap-1 text-xs" disabled={isSelf || !isAdmin}>
                      <UserX className="h-3 w-3" />
                      停用
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
