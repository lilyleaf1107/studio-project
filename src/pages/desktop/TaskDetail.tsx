import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ChevronRight,
  Play,
  CheckCircle2,
  Upload,
  Handshake,
  Clock,
  FolderGit2,
  User,
  AlertTriangle,
  Flag,
  XCircle,
  Send,
  History,
  Trash2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import Loading from '@/components/Loading'
import { useTask, useUpdateTaskStatus, useUpdateTaskPriority } from '@/hooks/useTasks'
import { useBigProject } from '@/hooks/useProjects'
import { useSubProject } from '@/hooks/useSubProjects'
import { useProfiles } from '@/hooks/useProfiles'
import { useStageName } from '@/hooks/useStages'
import { useWorkRecords, useCreateWorkRecord, RECORD_ACTION_LABELS, RECORD_ACTION_COLORS } from '@/hooks/useWorkRecords'
import {
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_FLAGS,
  TASK_CATEGORIES,
} from '@/lib/settings'
import { canReviewTask, canAdjustPriority } from '@/lib/permissions'
import { cn, formatDate, formatDateTime, isOverdue, getCountdown } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import type { TaskPriority } from '@/types'

const PRIORITY_CYCLE: TaskPriority[] = ['low', 'medium', 'high']

export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const { data: task, isLoading } = useTask(id)
  const { data: bigProject } = useBigProject(task?.big_project_id)
  const { data: subProject } = useSubProject(task?.sub_project_id)
  const { data: profiles } = useProfiles()
  const stageName = useStageName(task?.stage)
  const updateStatus = useUpdateTaskStatus()
  const updatePriority = useUpdateTaskPriority()
  const createRecord = useCreateWorkRecord()
  const qc = useQueryClient()
  const { data: records } = useWorkRecords(id ? { task_id: id } : undefined)

  const isAssigned = profile?.id === task?.assignee_id
  const canReview = canReviewTask(profile?.role)
  const canEditPriority = canAdjustPriority(profile?.role)
  const overdue = task && task.status !== 'done' && isOverdue(task.due_date)

  function cyclePriority(current: TaskPriority) {
    if (!id) return
    const idx = PRIORITY_CYCLE.indexOf(current)
    const next = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length]
    updatePriority.mutate({ id, priority: next })
  }

  const [rejectOpen, setRejectOpen] = useState(false)
  const [delayOpen, setDelayOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [note, setNote] = useState('')

  const profileMap: Record<string, string> = {}
  profiles?.forEach((p) => (profileMap[p.id] = p.name))
  const categoryName = TASK_CATEGORIES.find((c) => c.key === task?.task_category)?.name

  async function doStart() {
    if (!id) return
    try {
      await updateStatus.mutateAsync({ id, status: 'doing' })
      await createRecord.mutateAsync({
        task_id: id,
        big_project_id: task?.big_project_id,
        sub_project_id: task?.sub_project_id,
        action: 'start',
        content: '开始处理任务'
      })
      toast.success('已开始处理')
    } catch (e: any) {
      toast.error(e?.message || '更新失败')
    }
  }

  async function doSubmit() {
    if (!id) return
    try {
      await updateStatus.mutateAsync({ id, status: 'review' })
      await createRecord.mutateAsync({
        task_id: id,
        big_project_id: task?.big_project_id,
        sub_project_id: task?.sub_project_id,
        action: 'submit',
        content: '提交完成，等待验收'
      })
      toast.success('已提交验收')
    } catch (e: any) {
      toast.error(e?.message || '更新失败')
    }
  }

  async function doDelayRequest() {
    if (!note.trim()) {
      toast.error('请填写一句延期原因')
      return
    }
    try {
      await createRecord.mutateAsync({
        task_id: id,
        big_project_id: task?.big_project_id,
        sub_project_id: task?.sub_project_id,
        action: 'delay_request',
        content: `申请延期：${note.trim()}`
      })
      setDelayOpen(false)
      setNote('')
      toast.success('已提交延期申请，等待老板/管理员确认')
    } catch (e: any) {
      toast.error(e?.message || '失败')
    }
  }

  async function doHelpRequest() {
    try {
      await createRecord.mutateAsync({
        task_id: id,
        big_project_id: task?.big_project_id,
        sub_project_id: task?.sub_project_id,
        action: 'comment',
        content: `请求协助${note.trim() ? `：${note.trim()}` : ''}`
      })
      setHelpOpen(false)
      setNote('')
      toast.success('已通知负责人您需要协助')
    } catch (e: any) {
      toast.error(e?.message || '失败')
    }
  }

  async function doApprove() {
    if (!id) return
    try {
      await updateStatus.mutateAsync({ id, status: 'done', patch: { reject_reason: undefined } })
      await createRecord.mutateAsync({
        task_id: id,
        big_project_id: task?.big_project_id,
        sub_project_id: task?.sub_project_id,
        action: 'approve',
        content: '验收通过，任务完成'
      })
      toast.success('已通过验收，任务完成')
    } catch (e: any) {
      toast.error(e?.message || '更新失败')
    }
  }

  async function doReject() {
    if (!id) return
    if (!note.trim()) {
      toast.error('退回必须填写原因')
      return
    }
    try {
      await updateStatus.mutateAsync({ id, status: 'returned', patch: { reject_reason: note.trim() } })
      await createRecord.mutateAsync({
        task_id: id,
        big_project_id: task?.big_project_id,
        sub_project_id: task?.sub_project_id,
        action: 'reject',
        content: `验收退回：${note.trim()}`
      })
      toast.success('已退回任务')
      setRejectOpen(false)
      setNote('')
    } catch (e: any) {
      toast.error(e?.message || '更新失败')
    }
  }

  async function doResubmit() {
    if (!id) return
    try {
      await updateStatus.mutateAsync({ id, status: 'review', patch: { reject_reason: undefined } })
      await createRecord.mutateAsync({
        task_id: id,
        big_project_id: task?.big_project_id,
        sub_project_id: task?.sub_project_id,
        action: 'submit',
        content: '修改完成，重新提交验收'
      })
      toast.success('已重新提交')
    } catch (e: any) {
      toast.error(e?.message || '更新失败')
    }
  }

  async function handleDeleteTask() {
    if (!id) return
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['tasks'], exact: false })
      qc.invalidateQueries({ queryKey: ['task'], exact: false })
      qc.invalidateQueries({ queryKey: ['big-projects'], exact: false })
      toast.success('任务已删除')
      setDeleteOpen(false)
      navigate('/tasks')
    } catch (e: any) {
      toast.error(e?.message || '删除失败')
    }
  }

  if (isLoading) return <Loading />
  if (!task) {
    return (
      <Card className="p-10 text-center">
        <div className="text-muted-foreground mb-4">未找到该任务</div>
        <Link to="/tasks" className="text-primary hover:underline">← 返回任务中心</Link>
      </Card>
    )
  }

  const statusMeta = TASK_STATUS_LABELS[task.status] || TASK_STATUS_LABELS.todo
  const typeMeta = TASK_TYPE_LABELS[task.type]
  const priMeta = PRIORITY_LABELS[task.priority]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Link to="/tasks" className="hover:text-foreground">任务中心</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium truncate">{task.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            {canEditPriority ? (
              <button
                onClick={() => cyclePriority(task.priority)}
                className="shrink-0 text-3xl leading-none hover:scale-110 transition-transform cursor-pointer pt-0.5"
                title={`点击切换优先级：${priMeta.label}（低→中→高→低）`}
              >
                {PRIORITY_FLAGS[task.priority]}
              </button>
            ) : (
              <span className="shrink-0 text-3xl leading-none pt-0.5">
                {PRIORITY_FLAGS[task.priority]}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight">{task.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={cn(
                  'text-xs px-2.5 py-1 rounded-full font-medium',
                  overdue && task.status !== 'done' && task.status !== 'delayed'
                    ? 'bg-red-50 text-red-700'
                    : statusMeta.color
                )}>
                  {overdue && task.status !== 'done' && task.status !== 'delayed' ? '已逾期' : statusMeta.label}
                </span>
                <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', typeMeta.color)}>
                  {typeMeta.label}
                </span>
                {categoryName && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                    {categoryName}
                  </span>
                )}
                <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', priMeta.color)}>
                  优先级：{priMeta.label}
                </span>
              </div>
            </div>
          </div>
        </div>
        {canReview && (
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="icon" title="删除任务" className="shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>删除任务</DialogTitle>
              </DialogHeader>
              <div className="text-sm text-muted-foreground py-2">
                确定要删除任务「{task.name}」吗？该任务及其所有工作记录都会被移除，且操作不可恢复。
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>取消</Button>
                <Button variant="destructive" onClick={handleDeleteTask}>确认删除</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <User className="h-4 w-4" /> 负责人
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold">
                {(profileMap[task.assignee_id] || '?').slice(0, 1)}
              </div>
              <div className="font-medium">{profileMap[task.assignee_id] || '-'}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="h-4 w-4" /> 截止日期
            </div>
            <div className={cn('font-medium text-lg', overdue && 'text-red-600')}>
              {formatDate(task.due_date)}
            </div>
            {(() => {
              const countdown = getCountdown(task.due_date, task.start_date)
              if (!countdown) return null
              const isOverdueFlag = countdown.startsWith('🔥')
              return (
                <div className={cn('text-xs mt-0.5', isOverdueFlag ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
                  {countdown}
                </div>
              )
            })()}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <FolderGit2 className="h-4 w-4" /> 所属项目
            </div>
            <div className="text-sm font-medium truncate">
              {subProject?.name || bigProject?.name || '独立任务'}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {stageName || (bigProject ? '未设置阶段' : '')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Flag className="h-4 w-4" /> 创建时间
            </div>
            <div className="font-medium">{formatDate(task.created_at)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              更新 {formatDateTime(task.updated_at)}
            </div>
          </CardContent>
        </Card>
      </div>

      {task.description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">任务说明</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{task.description}</CardContent>
        </Card>
      )}
      {task.reject_reason && (
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-orange-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> 验收退回原因
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-orange-800 whitespace-pre-wrap">
            {task.reject_reason}
          </CardContent>
        </Card>
      )}

      {isAssigned && task.status !== 'done' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">我来操作（员工视图）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {task.status === 'todo' && (
                <Button onClick={doStart} className="gap-2" size="lg">
                  <Play className="h-4 w-4" /> 开始处理
                </Button>
              )}
              {(task.status === 'doing' || task.status === 'returned') && (
                <Button onClick={task.status === 'returned' ? doResubmit : doSubmit} className="gap-2" size="lg">
                  <Send className="h-4 w-4" />
                  {task.status === 'returned' ? '修改完成 · 重新提交' : '提交完成'}
                </Button>
              )}
              {(task.status === 'doing' || task.status === 'todo' || task.status === 'returned') && (
                <Button variant="outline" className="gap-2" size="lg" disabled>
                  <Upload className="h-4 w-4" /> 上传文件
                </Button>
              )}
              {task.status === 'doing' && (
                <>
                  <Dialog open={delayOpen} onOpenChange={setDelayOpen}>
                    <Button asChild variant="warning" className="gap-2" size="lg">
                      <button onClick={() => setDelayOpen(true)}>
                        <Clock className="h-4 w-4" /> 申请延期
                      </button>
                    </Button>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>申请延期</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2 py-2">
                        <Label>请简要说明延期原因 <span className="text-red-500">*</span></Label>
                        <Textarea
                          rows={3}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="例如：加工件周三才能到，预计延后 2 天。"
                          autoFocus
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDelayOpen(false)}>取消</Button>
                        <Button onClick={doDelayRequest}>提交申请</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
                    <Button asChild variant="outline" className="gap-2" size="lg">
                      <button onClick={() => setHelpOpen(true)}>
                        <Handshake className="h-4 w-4" /> 需要协助
                      </button>
                    </Button>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>需要协助</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2 py-2">
                        <Label>一句话说明卡在哪里（可选）</Label>
                        <Textarea
                          rows={3}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="例如：测试台架缺少零件，需要王工帮忙调一下。"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setHelpOpen(false)}>取消</Button>
                        <Button onClick={doHelpRequest}>通知负责人</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              只有「开始处理」「提交完成」「上传文件」不需要写说明；申请延期和需要协助请写一句话原因。
            </p>
          </CardContent>
        </Card>
      )}

      {canReview && task.status === 'review' && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-purple-800">待验收操作（老板/管理员）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="success" className="gap-2" size="lg" onClick={doApprove}>
                <CheckCircle2 className="h-4 w-4" /> 通过 · 任务完成
              </Button>
              <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <Button asChild variant="destructive" className="gap-2" size="lg">
                  <button onClick={() => setRejectOpen(true)}>
                    <XCircle className="h-4 w-4" /> 退回修改
                  </button>
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>退回任务</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 py-2">
                    <Label>请填写退回原因 <span className="text-red-500">*</span></Label>
                    <Textarea
                      rows={4}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="例如：图面缺少螺丝孔位，请补上。或：测试数据不够完整，请补充负载测试。"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      员工会在任务详情看到这条原因，并在修改后重新提交验收。
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRejectOpen(false)}>取消</Button>
                    <Button variant="destructive" onClick={doReject}>确认退回</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 工作动态时间线 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" /> 工作动态
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!records || records.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              还没有操作记录，任务被分配后会自动记录后续操作。
            </div>
          ) : (
            <div className="relative pl-6 space-y-5">
              <div className="absolute left-1.5 top-1 bottom-1 w-0.5 bg-border" />
              {records.map((r) => {
                const color = RECORD_ACTION_COLORS[r.action] || 'bg-slate-100 text-slate-700'
                return (
                  <div key={r.id} className="relative">
                    <div className={cn(
                      'absolute -left-[22px] top-0.5 h-3 w-3 rounded-full ring-2 ring-white',
                      color.split(' ')[0]
                    )} />
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', color)}>
                        {RECORD_ACTION_LABELS[r.action] || r.action}
                      </span>
                      <span className="text-sm font-medium">
                        {r.operator_name || profileMap[r.operator_id] || '系统'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(r.created_at)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {r.content}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
