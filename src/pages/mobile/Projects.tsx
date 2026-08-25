import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, ChevronRight, Filter } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import Loading from '@/components/Loading'
import { useBigProjects, useCreateBigProject } from '@/hooks/useProjects'
import { useSubProjects } from '@/hooks/useSubProjects'
import { useProfiles } from '@/hooks/useProfiles'
import { PROJECT_STATUS_LABELS } from '@/lib/settings'
import { cn, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { canCreateProject } from '@/lib/permissions'
import type { ProjectStatus } from '@/types'

export default function Projects() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const { data: projects, isLoading } = useBigProjects()
  const { data: subProjects } = useSubProjects()
  const { data: profiles } = useProfiles()
  const createMutation = useCreateBigProject()

  const [open, setOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    name: '',
    code: '',
    owner_id: profile?.id || '',
    start_date: formatDate(new Date()),
    end_date: formatDate(new Date(Date.now() + 90 * 86400000)),
    status: 'active' as ProjectStatus,
    description: ''
  })

  const profileMap: Record<string, string> = {}
  profiles?.forEach((p) => (profileMap[p.id] = p.name))

  const subCountMap: Record<string, number> = {}
  subProjects?.forEach((sp) => {
    subCountMap[sp.big_project_id] = (subCountMap[sp.big_project_id] || 0) + 1
  })

  const filtered = (projects || [])
    .filter((p) => statusFilter === 'all' || p.status === statusFilter)
    .filter((p) => !search || p.name.includes(search) || (p.code || '').includes(search))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('请填写项目名称')
      return
    }
    if (!form.owner_id) {
      toast.error('请选择负责人')
      return
    }
    try {
      await createMutation.mutateAsync({ ...form })
      toast.success('大项目已创建')
      setOpen(false)
      setForm({ ...form, name: '', code: '', description: '' })
    } catch (e: any) {
      toast.error(e?.message || '创建失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">大项目</h1>
          <p className="text-xs text-muted-foreground mt-0.5">共 {projects?.length || 0} 个</p>
        </div>
        {canCreateProject(profile?.role) && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />新建</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>新增大项目</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-2">
                  <Label>项目名称 <span className="text-red-500">*</span></Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="例如：XX 自动化设备项目"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>项目编号</Label>
                    <Input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="可选"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>负责人 <span className="text-red-500">*</span></Label>
                    <Select value={form.owner_id} onValueChange={(v) => setForm({ ...form, owner_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {profiles?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>开始日期 <span className="text-red-500">*</span></Label>
                    <Input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>计划结束 <span className="text-red-500">*</span></Label>
                    <Input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>项目状态</Label>
                  <Select value={form.status} onValueChange={(v: ProjectStatus) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">未开始</SelectItem>
                      <SelectItem value="active">进行中</SelectItem>
                      <SelectItem value="paused">暂停</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>项目说明（可选）</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? '创建中...' : '创建项目'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* 筛选条 */}
      <div className="flex gap-2">
        <Input
          placeholder="搜索项目名/编号"
          className="flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 项目列表 */}
      {isLoading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {projects?.length === 0 ? '还没有大项目' : '没有符合条件的项目'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const statusMeta = PROJECT_STATUS_LABELS[p.status] || PROJECT_STATUS_LABELS.pending
            return (
              <Card
                key={p.id}
                className="cursor-pointer active:bg-muted/40 transition-colors"
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{p.name}</div>
                      {p.code && <div className="text-xs text-muted-foreground mt-0.5">编号 {p.code}</div>}
                    </div>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0',
                      statusMeta.color
                    )}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center text-[9px] font-semibold">
                        {(profileMap[p.owner_id] || '?').slice(0, 1)}
                      </span>
                      {profileMap[p.owner_id] || '-'}
                    </span>
                    <span>{subCountMap[p.id] || 0} 个小项目</span>
                    <ChevronRight className="h-3.5 w-3.5 ml-auto" />
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
