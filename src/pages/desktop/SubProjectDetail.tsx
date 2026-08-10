import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Edit2,
  FolderGit2,
  Calendar,
  Users,
  ChevronRight,
  Plus
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Loading from '@/components/Loading'
import { useSubProject, useUpdateSubProject } from '@/hooks/useSubProjects'
import { useBigProject } from '@/hooks/useProjects'
import { useProfiles } from '@/hooks/useProfiles'
import { useStages } from '@/hooks/useStages'
import { PROJECT_STATUS_LABELS, DEFAULT_STAGES } from '@/lib/settings'
import { canCreateProject } from '@/lib/permissions'
import { cn, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import type { SubProjectStatus } from '@/types'

export default function SubProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const canEdit = canCreateProject(profile?.role)

  const { data: sp, isLoading } = useSubProject(id)
  const { data: bigProject } = useBigProject(sp?.big_project_id)
  const { data: profiles } = useProfiles()
  const { data: stages } = useStages()
  const updateMutation = useUpdateSubProject()

  const profileMap: Record<string, string> = {}
  profiles?.forEach((p) => (profileMap[p.id] = p.name))

  async function changeStage(key: string) {
    if (!id) return
    try {
      await updateMutation.mutateAsync({ id, patch: { stage: key } })
      toast.success('阶段已更新')
    } catch (e: any) {
      toast.error(e?.message || '更新失败')
    }
  }

  async function changeStatus(status: SubProjectStatus) {
    if (!id) return
    try {
      await updateMutation.mutateAsync({ id, patch: { status } })
      toast.success('状态已更新')
    } catch (e: any) {
      toast.error(e?.message || '更新失败')
    }
  }

  if (isLoading) return <Loading />
  if (!sp) {
    return (
      <Card className="p-10 text-center">
        <div className="text-muted-foreground mb-4">未找到该小项目</div>
        <Link to="/projects" className="text-primary hover:underline">← 返回大项目列表</Link>
      </Card>
    )
  }

  const stageName = (stages || DEFAULT_STAGES).find((s: any) => s.key === sp.stage)?.name || sp.stage || '-'
  const statusMeta = PROJECT_STATUS_LABELS[sp.status] || PROJECT_STATUS_LABELS.pending

  return (
    <div className="space-y-6">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {bigProject && (
          <>
            <Link to="/projects" className="hover:text-foreground">大项目</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to={`/projects/${bigProject.id}`} className="hover:text-foreground">{bigProject.name}</Link>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        <span className="text-foreground font-medium">{sp.name}</span>
      </div>

      {/* 标题区 */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{sp.name}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={cn(
              'text-xs px-2.5 py-1 rounded-full font-medium',
              statusMeta.color
            )}>
              {statusMeta.label}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
              阶段：{stageName}
            </span>
          </div>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              小项目负责人
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold">
                {(profileMap[sp.owner_id] || '?').slice(0, 1)}
              </div>
              <div className="font-medium">{profileMap[sp.owner_id] || '-'}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <FolderGit2 className="h-4 w-4" />
              当前阶段
            </div>
            {canEdit ? (
              <Select defaultValue={sp.stage || ''} onValueChange={changeStage}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(stages || DEFAULT_STAGES).map((s: any) => (
                    <SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="font-medium text-lg">{stageName}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              开始 ~ 结束
            </div>
            <div className="font-medium">
              {sp.start_date ? formatDate(sp.start_date) : '-'}
            </div>
            <div className="text-xs text-muted-foreground">
              {sp.end_date ? formatDate(sp.end_date) : '未设置截止'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">状态</div>
            {canEdit ? (
              <Select defaultValue={sp.status} onValueChange={(v: SubProjectStatus) => changeStatus(v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className={cn(
                'text-xs px-2.5 py-1.5 rounded-full font-medium inline-block mt-2',
                statusMeta.color
              )}>
                {statusMeta.label}
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 备注 */}
      {sp.description && (
        <Card>
          <CardContent className="p-5 text-sm whitespace-pre-wrap">{sp.description}</CardContent>
        </Card>
      )}

      {/* 阶段流转指示 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">阶段进度</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {(stages || DEFAULT_STAGES).map((s: any, i: number) => {
              const activeKey = sp.stage || ''
              const state: 'done' | 'current' | 'pending' =
                s.key === activeKey ? 'current' :
                  ((stages || DEFAULT_STAGES).findIndex((x: any) => x.key === activeKey) > i ? 'done' : 'pending')
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap',
                    state === 'done' && 'bg-emerald-50 text-emerald-700',
                    state === 'current' && 'bg-primary text-white ring-2 ring-primary/20',
                    state === 'pending' && 'bg-muted text-muted-foreground'
                  )}>
                    {state === 'done' && '✓ '}
                    {s.name}
                  </div>
                  {i < (stages?.length || DEFAULT_STAGES.length) - 1 && (
                    <div className="w-6 h-px bg-border hidden sm:block" />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 任务列表（第3步完善） */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">
            任务列表
            <span className="text-xs text-muted-foreground font-normal ml-2">（第 3 步开发任务功能）</span>
          </CardTitle>
          <Button size="sm" variant="outline" className="gap-2" disabled>
            <Plus className="h-4 w-4" />新增任务
          </Button>
        </CardHeader>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          下一个步骤会在这里显示该小项目下的所有任务，以及每个任务的负责人、状态和进度。
        </CardContent>
      </Card>
    </div>
  )
}
