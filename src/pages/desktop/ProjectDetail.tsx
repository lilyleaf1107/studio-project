import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  FolderGit2,
  Calendar,
  FileText,
  Users,
  ChevronRight,
  MoreHorizontal,
  Edit2
} from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Loading from '@/components/Loading'
import { useBigProject, useUpdateBigProjectStatus } from '@/hooks/useProjects'
import { useSubProjects, useCreateSubProject } from '@/hooks/useSubProjects'
import { useProfiles } from '@/hooks/useProfiles'
import { useStages, useStageName } from '@/hooks/useStages'
import { PROJECT_STATUS_LABELS, DEFAULT_STAGES } from '@/lib/settings'
import { canCreateProject } from '@/lib/permissions'
import { cn, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import type { ProjectStatus, SubProjectStatus } from '@/types'

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)

  const { data: project, isLoading } = useBigProject(id)
  const { data: subProjects, isLoading: subLoading } = useSubProjects(id)
  const { data: profiles } = useProfiles()
  const { data: stages } = useStages()
  const createSub = useCreateSubProject()
  const updateStatus = useUpdateBigProjectStatus()

  const [subOpen, setSubOpen] = useState(false)
  const [subForm, setSubForm] = useState({
    name: '',
    owner_id: profile?.id || '',
    stage: (stages?.[0]?.key as string) || '',
    status: 'active' as SubProjectStatus,
    description: ''
  })

  const profileMap: Record<string, string> = {}
  profiles?.forEach((p) => (profileMap[p.id] = p.name))

  // 进度：根据子项目完成比例估算
  let progress = 0
  if (subProjects && subProjects.length > 0) {
    const done = subProjects.filter((s) => s.status === 'completed').length
    const doing = subProjects.filter((s) => s.status === 'active' || s.status === 'reviewing').length
    progress = Math.round((done * 100 + doing * 50) / subProjects.length)
  }

  const delayedCount = subProjects?.filter((s) => s.status === 'delayed').length || 0
  const canEdit = canCreateProject(profile?.role)

  async function handleCreateSub(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    if (!subForm.name.trim()) {
      toast.error('请填写小项目名称')
      return
    }
    if (!subForm.owner_id) {
      toast.error('请选择负责人')
      return
    }
    try {
      await createSub.mutateAsync({
        big_project_id: id,
        ...subForm
      })
      toast.success('小项目已创建')
      setSubOpen(false)
      setSubForm({ ...subForm, name: '', description: '' })
    } catch (e: any) {
      toast.error(e?.message || '创建失败')
    }
  }

  if (isLoading) return <Loading />
  if (!project) {
    return (
      <Card className="p-10 text-center">
        <div className="text-muted-foreground mb-4">未找到该项目</div>
        <Link to="/projects" className="text-primary hover:underline">← 返回列表</Link>
      </Card>
    )
  }

  const statusMeta = PROJECT_STATUS_LABELS[project.status] || PROJECT_STATUS_LABELS.pending

  return (
    <div className="space-y-6">
      {/* 顶部 */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/projects')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight truncate">{project.name}</h1>
              <span className={cn(
                'text-xs px-2.5 py-1 rounded-full font-medium shrink-0',
                statusMeta.color
              )}>
                {statusMeta.label}
              </span>
            </div>
            {project.code && <div className="text-sm text-muted-foreground mt-1">项目编号：{project.code}</div>}
          </div>
        </div>
        {canEdit && (
          <Select
            defaultValue={project.status}
            onValueChange={(v: ProjectStatus) => updateStatus.mutate({ id: project.id, status: v })}
          >
            <SelectTrigger className="w-40">
              <span className="text-xs text-muted-foreground mr-2">改状态</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <FolderGit2 className="h-4 w-4" />
              总完成度
            </div>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-primary">{progress}%</div>
            </div>
            <div className="h-2 bg-muted rounded-full mt-3 overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <FileText className="h-4 w-4" />
              小项目数量
            </div>
            <div className="text-3xl font-bold">{subProjects?.length || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              已完成 {subProjects?.filter((s) => s.status === 'completed').length || 0} · 进行中 {subProjects?.filter((s) => s.status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              风险提醒
            </div>
            <div className={cn(
              'text-3xl font-bold',
              delayedCount > 0 ? 'text-red-600' : 'text-emerald-600'
            )}>
              {delayedCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {delayedCount > 0 ? '有小项目已延期' : '一切正常'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              总负责人
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold">
                {(profileMap[project.owner_id] || '?').slice(0, 1)}
              </div>
              <div className="font-medium">{profileMap[project.owner_id] || '-'}</div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {formatDate(project.start_date)} ~ {formatDate(project.end_date)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 说明 */}
      {project.description && (
        <Card>
          <CardContent className="p-5 text-sm whitespace-pre-wrap">{project.description}</CardContent>
        </Card>
      )}

      {/* 小项目列表 */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">
            小项目列表 <span className="text-muted-foreground font-normal ml-1">({subProjects?.length || 0})</span>
          </CardTitle>
          {canEdit && (
            <Dialog open={subOpen} onOpenChange={setSubOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />拆分小项目</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>拆分小项目</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSub} className="space-y-4">
                  <div className="space-y-2">
                    <Label>小项目名称 <span className="text-red-500">*</span></Label>
                    <Input
                      value={subForm.name}
                      onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                      placeholder="例如：外壳设计 / 结构测试 / 加工件制作"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>负责人 <span className="text-red-500">*</span></Label>
                      <Select value={subForm.owner_id} onValueChange={(v) => setSubForm({ ...subForm, owner_id: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {profiles?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>当前阶段</Label>
                      <Select value={subForm.stage} onValueChange={(v) => setSubForm({ ...subForm, stage: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(stages || DEFAULT_STAGES).map((s: any) => (
                            <SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>起始状态</Label>
                    <Select value={subForm.status} onValueChange={(v: SubProjectStatus) => setSubForm({ ...subForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">未开始</SelectItem>
                        <SelectItem value="active">进行中</SelectItem>
                        <SelectItem value="blocked">等待前置</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>备注（可选）</Label>
                    <Textarea rows={3} value={subForm.description} onChange={(e) => setSubForm({ ...subForm, description: e.target.value })} />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setSubOpen(false)}>取消</Button>
                    <Button type="submit" disabled={createSub.isPending}>
                      {createSub.isPending ? '创建中...' : '创建小项目'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>

        <div className="border-t" />

        {subLoading ? (
          <Loading />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>小项目名称</TableHead>
                <TableHead>阶段</TableHead>
                <TableHead>负责人</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!subProjects || subProjects.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    还没有小项目，点击右上角「拆分小项目」
                  </TableCell>
                </TableRow>
              )}
              {subProjects?.map((sp) => {
                const meta = PROJECT_STATUS_LABELS[sp.status] || PROJECT_STATUS_LABELS.pending
                const stageName = stages?.find((s) => s.key === sp.stage)?.name || (DEFAULT_STAGES.find((x) => x.key === sp.stage)?.name || '-')
                return (
                  <TableRow
                    key={sp.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => navigate(`/sub-projects/${sp.id}`)}
                  >
                    <TableCell className="font-medium">{sp.name}</TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-1 rounded-md bg-secondary">
                        {stageName}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                          {(profileMap[sp.owner_id] || '?').slice(0, 1)}
                        </div>
                        <span className="text-sm">{profileMap[sp.owner_id] || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'text-xs px-2.5 py-1 rounded-full font-medium',
                        meta.color
                      )}>
                        {meta.label}
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
