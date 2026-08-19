import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
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
  History
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import Loading from '@/components/Loading'
import { useTask, useUpdateTaskStatus } from '@/hooks/useTasks'
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
import { canReviewTask } from '@/lib/permissions'
import { cn, formatDate, formatDateTime, isOverdue, getCountdown } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

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
  const createRecord = useCreateWorkRecord()
  const { data: records } = useWorkRecords(id ? { task_id: id } : undefined)

  const isAssigned = profile?.id === task?.assignee_id
  const canReview = canReviewTask(profile?.role)
  const overdue = task && task.status !== 'done' && isOverdue(task.due_date)

  const [rejectOpen, setRejectOpen] = useState(false)
  const [delayOpen, setDelayOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
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
      toast.success('已提交延期申请')
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
      toast.success('已通知负责人')
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
      toast.success('已通过验收')
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

  if (isLoading) return <Loading />
  if (!task) {
    return (
      <Card className="p-8 text-center">
        <div className="text-muted-foreground mb-4">未找到该任务</div>
        <Link to="/tasks" className="text-primary hover:underline">← 返回</Link>
      </Card>
    )
  }

  const statusMeta = TASK_STATUS_LABELS[task.status] || TASK_STATUS_LABELS.todo
  const typeMeta = TASK_TYPE_LABELS[task.type]
  const priMeta = PRIORITY_LABELS[task.priority]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="shrink-0 text-2xl leading-none">{PRIORITY_FLAGS[task.priority]}</span>
        <h1 className="text-lg font-bold truncate flex-1 min-w-0">{task.name}</h1>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn(
              'text-[11px] px-2 py-0.5 rounded-full font-medium',
              overdue && task.status !== 'done' && task.status !== 'delayed'
                ? 'bg-red-50 text-red-700'
                : statusMeta.color
            )}>
              {overdue && task.status !== 'done' && task.status !== 'delayed' ? '已逾期' : statusMeta.label}
            </span>
            <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', typeMeta.color)}>
              {typeMeta.label}
            </span>
            {categoryName && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                {categoryName}
              </span>
            )}
            <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', priMeta.color)}>
              {priMeta.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t">
            <div>
              <div className="text-muted-foreground mb-1 flex items-center gap-1"><User className="h-3.5 w-3.5" /> 负责人</div>
              <div className="font-medium">{profileMap[task.assignee_id] || '-'}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 截止</div>
              <div className={cn('font-medium', overdue && 'text-red-600')}>
                {formatDate(task.due_date)}
              </div>
              {(() => {
                const countdown = getCountdown(task.due_date, task.start_date)
                if (!countdown) return null
                const isOverdueFlag = countdown.startsWith('🔥')
                return (
                  <div className={cn('text-[11px] mt-0.5', isOverdueFlag ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
                    {countdown}
                  </div>
                )
              })()}
            </div>
            <div>
              <div className="text-muted-foreground mb-1 flex items-center gap-1"><FolderGit2 className="h-3.5 w-3.5" /> 项目</div>
              <div className="font-medium truncate">{subProject?.name || bigProject?.name || '独立'}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1 flex items-center gap-1"><Flag className="h-3.5 w-3.5" /> 创建</div>
              <div className="font-medium">{formatDate(task.created_at)}</div>
            </div>
          </div>

          {stageName && (
            <div className="text-xs pt-2 border-t">
              <span className="text-muted-foreground">阶段：</span>
              <span className="font-medium">{stageName}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {task.description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">任务说明</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{task.description}</CardContent>
        </Card>
      )}

      {task.reject_reason && (
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> 退回原因
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-orange-800 whitespace-pre-wrap">
            {task.reject_reason}
          </CardContent>
        </Card>
      )}

      {/* 员工操作 */}
      {isAssigned && task.status !== 'done' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">我来操作</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {task.status === 'todo' && (
              <Button onClick={doStart} className="gap-1 col-span-2">
                <Play className="h-4 w-4" /> 开始处理
              </Button>
            )}
            {(task.status === 'doing' || task.status === 'returned') && (
              <Button onClick={task.status === 'returned' ? doResubmit : doSubmit} className="gap-1 col-span-2">
                <Send className="h-4 w-4" />
                {task.status === 'returned' ? '修改完成·重新提交' : '提交完成'}
              </Button>
            )}
            {(task.status === 'doing' || task.status === 'todo' || task.status === 'returned') && (
              <Button variant="outline" className="gap-1" disabled>
                <Upload className="h-4 w-4" /> 上传
              </Button>
            )}
            {task.status === 'doing' && (
              <>
                <Dialog open={delayOpen} onOpenChange={setDelayOpen}>
                  <Button asChild variant="warning" className="gap-1">
                    <button onClick={() => setDelayOpen(true)}>
                      <Clock className="h-4 w-4" /> 申请延期
                    </button>
                  </Button>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>申请延期</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                      <Label>延期原因 <span className="text-red-500">*</span></Label>
                      <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="简要说明原因" autoFocus />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDelayOpen(false)}>取消</Button>
                      <Button onClick={doDelayRequest}>提交</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
                  <Button asChild variant="outline" className="gap-1">
                    <button onClick={() => setHelpOpen(true)}>
                      <Handshake className="h-4 w-4" /> 需要协助
                    </button>
                  </Button>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>需要协助</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                      <Label>卡在哪里（可选）</Label>
                      <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="简要说明" />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setHelpOpen(false)}>取消</Button>
                      <Button onClick={doHelpRequest}>通知</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* 验收操作 */}
      {canReview && task.status === 'review' && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-purple-800">待验收操作</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="success" className="gap-1" onClick={doApprove}>
              <CheckCircle2 className="h-4 w-4" /> 通过
            </Button>
            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
              <Button asChild variant="destructive" className="gap-1">
                <button onClick={() => setRejectOpen(true)}>
                  <XCircle className="h-4 w-4" /> 退回
                </button>
              </Button>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>退回任务</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 py-2">
                  <Label>退回原因 <span className="text-red-500">*</span></Label>
                  <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="请填写原因" autoFocus />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRejectOpen(false)}>取消</Button>
                  <Button variant="destructive" onClick={doReject}>确认退回</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* 工作动态 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" /> 工作动态
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!records || records.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center">还没有操作记录</div>
          ) : (
            <div className="relative pl-5 space-y-4">
              <div className="absolute left-1.5 top-1 bottom-1 w-0.5 bg-border" />
              {records.map((r) => {
                const color = RECORD_ACTION_COLORS[r.action] || 'bg-slate-100 text-slate-700'
                return (
                  <div key={r.id} className="relative">
                    <div className={cn(
                      'absolute -left-[19px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white',
                      color.split(' ')[0]
                    )} />
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', color)}>
                        {RECORD_ACTION_LABELS[r.action] || r.action}
                      </span>
                      <span className="text-xs font-medium">
                        {r.operator_name || profileMap[r.operator_id] || '系统'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-0.5">{r.content}</div>
                    <div className="text-[10px] text-muted-foreground">{formatDateTime(r.created_at)}</div>
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
