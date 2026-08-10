import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
      setForm({
        ...form,
        name: '',
        code: '',
        description: ''
      })
    } catch (e: any) {
      toast.error(e?.message || '创建失败')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">大项目</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理长线大项目，以及下面拆分的小项目（共 {projects?.length || 0} 个大项目）
          </p>
        </div>
        {canCreateProject(profile?.role) && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />新增大项目</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>新增大项目</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>项目名称 <span className="text-red-500">*</span></Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="例如：XX 自动化设备项目"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>项目编号</Label>
                    <Input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="例如：P2026-001（可选）"
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
                    <Label>计划结束日期 <span className="text-red-500">*</span></Label>
                    <Input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
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
                  <div className="space-y-2 col-span-2">
                    <Label>项目说明（可选）</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="有特殊要求才填写"
                      rows={3}
                    />
                  </div>
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
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            筛选：
          </div>
          <Input
            placeholder="搜索项目名/编号"
            className="max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 项目列表 */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <Loading />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>项目名称</TableHead>
                <TableHead>负责人</TableHead>
                <TableHead className="hidden md:table-cell">周期</TableHead>
                <TableHead>小项目数</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    {projects?.length === 0 ? '还没有大项目，点击右上角新建一个' : '没有符合条件的项目'}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((p) => {
                const statusMeta = PROJECT_STATUS_LABELS[p.status] || PROJECT_STATUS_LABELS.pending
                return (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => navigate(`/projects/${p.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      {p.code && <div className="text-xs text-muted-foreground mt-0.5">编号 {p.code}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                          {(profileMap[p.owner_id] || '?').slice(0, 1)}
                        </div>
                        <span className="text-sm">{profileMap[p.owner_id] || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {formatDate(p.start_date)} ~ {formatDate(p.end_date)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{subCountMap[p.id] || 0} 个</TableCell>
                    <TableCell>
                      <span className={cn(
                        'text-xs px-2.5 py-1 rounded-full font-medium',
                        statusMeta.color
                      )}>
                        {statusMeta.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
