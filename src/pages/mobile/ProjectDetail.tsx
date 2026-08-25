import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  FolderGit2,
  Calendar,
  FileText,
  Users,
  ChevronRight,
  Trash2,
  Check
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
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
import Loading from '@/components/Loading'
import { useBigProject, useUpdateBigProjectStatus } from '@/hooks/useProjects'
import { useSubProjects, useCreateSubProject } from '@/hooks/useSubProjects'
import { useProfiles } from '@/hooks/useProfiles'
import { useStages } from '@/hooks/useStages'
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
  const { data: subProjects } = useSubProjects(id)
  const { data: profiles } = useProfiles()
  const { data: stages } = useStages()
  const createSub = useCreateSubProject()
  const updateStatus = useUpdateBigProjectStatus()
  const qc = useQueryClient()

  const [subOpen, setSubOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [subForm, setSubForm] = useState({
    name: '',
    owner_id: profile?.id || '',
    stage: (stages?.[0]?.key as string) || '',
    status: 'active' as SubProjectStatus,
    description: ''
  })

  const profileMap: Record<string, string> = {}
  profiles?.forEach((p) => (profileMap[p.id] = p.name))

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
    try {
      await createSub.mutateAsync({ big_project_id: id, ...subForm })
      toast.success('小项目已创建')
      setSubOpen(false)
      setSubForm({ ...subForm, name: '', description: '' })
    } catch (e: any) {
      toast.error(e?.message || '创建失败')
    }
  }

  async function handleDeleteProject() {
    if (!project) return
    try {
      const { error } = await supabase.from('big_projects').delete().eq('id', project.id)
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['big-projects'] })
      toast.success('项目已删除')
      setDeleteOpen(false)
      navigate('/projects')
    } catch (e: any) {
      toast.error(e?.message || '删除失败')
    }
  }

  if (isLoading) return <Loading />
  if (!project) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground mb-3">未找到该项目</div>
          <Link to="/projects" className="text-primary">← 返回列表</Link>
        </CardContent>
      </Card>
    )
  }

  const statusMeta = PROJECT_STATUS_LABELS[project.status] || PROJECT_STATUS_LABELS.pending

  return (
    <div className="space-y-4">
      {/* 顶部 */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/projects')} className="shrink-0 -ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold truncate flex-1">{project.name}</h1>
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0',
              statusMeta.color
            )}>
              {statusMeta.label}
            </span>
          </div>
          {project.code && <div className="text-xs text-muted-foreground mt-0.5">编号：{project.code}</div>}
        </div>
      </div>

      {/* 操作按钮 */}
      {canEdit && (
        <div className="flex gap-2">
          <Select
            defaultValue={project.status}
            onValueChange={(v: ProjectStatus) => updateStatus.mutate({ id: project.id, status: v })}
          >
            <SelectTrigger className="flex-1 h-9 text-sm">
              <span className="text-xs text-muted-foreground mr-1">状态</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="icon" className="shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>删除项目</DialogTitle></DialogHeader>
              <div className="text-sm text-muted-foreground py-2">
                确定要删除项目「{project.name}」吗？该操作不可恢复。
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>取消</Button>
                <Button variant="destructive" onClick={handleDeleteProject}>确认删除</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* 概览 */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <FolderGit2 className="h-3.5 w-3.5" />总完成度
            </div>
            <div className="text-xl font-bold text-primary">{progress}%</div>
            <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <FileText className="h-3.5 w-3.5" />小项目数
            </div>
            <div className="text-xl font-bold">{subProjects?.length || 0}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              完成 {subProjects?.filter((s) => s.status === 'completed').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Calendar className="h-3.5 w-3.5" />风险提醒
            </div>
            <div className={cn(
              'text-xl font-bold',
              delayedCount > 0 ? 'text-red-600' : 'text-emerald-600'
            )}>
              {delayedCount}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {delayedCount > 0 ? '有延期' : '正常'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Users className="h-3.5 w-3.5" />负责人
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold">
                {(profileMap[project.owner_id] || '?').slice(0, 1)}
              </div>
              <span className="text-sm font-medium truncate">{profileMap[project.owner_id] || '-'}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {formatDate(project.start_date)} ~ {formatDate(project.end_date)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 项目阶段进度 */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">项目阶段进度</CardTitle></CardHeader>
        <CardContent>
          {(!stages || stages.length === 0) && (!subProjects || subProjects.length === 0) ? (
            <div className="text-xs text-muted-foreground py-2">暂无阶段数据</div>
          ) : (
            <div className="flex items-start overflow-x-auto pb-2 -mx-1 px-1">
              {(stages || DEFAULT_STAGES).map((s: any, i: number) => {
                const stageList = stages || DEFAULT_STAGES
                const count = subProjects?.filter((sp) => sp.stage === s.key).length || 0
                const subStageIdx = (subProjects || [])
                  .map((sp) => stageList.findIndex((x: any) => x.key === sp.stage))
                  .filter((idx) => idx >= 0)
                const currentIdx = subStageIdx.length > 0 ? Math.max(...subStageIdx) : -1
                const state: 'done' | 'current' | 'pending' =
                  currentIdx < 0 ? 'pending' :
                  i < currentIdx ? 'done' :
                  i === currentIdx ? 'current' : 'pending'
                const isLast = i === stageList.length - 1
                return (
                  <div key={s.key} className="flex items-start shrink-0">
                    <div className="flex flex-col items-center gap-1 w-16">
                      <div className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                        state === 'done' && 'bg-emerald-500 text-white',
                        state === 'current' && 'bg-primary text-white',
                        state === 'pending' && 'bg-muted text-muted-foreground'
                      )}>
                        {state === 'done' && <Check className="h-4 w-4" />}
                        {state === 'current' && <span className="h-2 w-2 rounded-full bg-white" />}
                        {state === 'pending' && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />}
                      </div>
                      <div className="text-[10px] font-medium text-center leading-tight">{s.name}</div>
                      <div className="text-[9px] text-muted-foreground">{count} 个</div>
                    </div>
                    {!isLast && (
                      <div className={cn(
                        'h-0.5 w-5 mt-4 shrink-0',
                        state === 'done' ? 'bg-emerald-500' : 'bg-border'
                      )} />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 说明 */}
      {project.description && (
        <Card>
          <CardContent className="p-3 text-sm whitespace-pre-wrap">{project.description}</CardContent>
        </Card>
      )}

      {/* 小项目列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-sm">
            小项目 ({subProjects?.length || 0})
          </CardTitle>
          {canEdit && (
            <Dialog open={subOpen} onOpenChange={setSubOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 gap-1"><Plus className="h-3.5 w-3.5" />新建</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>拆分小项目</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateSub} className="space-y-3">
                  <div className="space-y-2">
                    <Label>小项目名称 <span className="text-red-500">*</span></Label>
                    <Input
                      value={subForm.name}
                      onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
                    <Textarea rows={2} value={subForm.description} onChange={(e) => setSubForm({ ...subForm, description: e.target.value })} />
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
        <CardContent className="space-y-2">
          {(!subProjects || subProjects.length === 0) ? (
            <div className="text-xs text-muted-foreground py-6 text-center">
              还没有小项目{canEdit ? '，点击右上角新建' : ''}
            </div>
          ) : (
            subProjects?.map((sp) => {
              const meta = PROJECT_STATUS_LABELS[sp.status] || PROJECT_STATUS_LABELS.pending
              const stageName = stages?.find((s) => s.key === sp.stage)?.name || (DEFAULT_STAGES.find((x) => x.key === sp.stage)?.name || '-')
              return (
                <button
                  key={sp.id}
                  onClick={() => navigate(`/sub-projects/${sp.id}`)}
                  className="w-full text-left p-3 rounded-lg border hover:border-primary active:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate flex-1">{sp.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary">{stageName}</span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', meta.color)}>
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {profileMap[sp.owner_id] || '-'}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
