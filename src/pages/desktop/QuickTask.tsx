import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, CheckCircle2, Lock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useProfiles } from '@/hooks/useProfiles'
import { useCreateTask } from '@/hooks/useTasks'
import { useCreateWorkRecord } from '@/hooks/useWorkRecords'
import { useBigProjects } from '@/hooks/useProjects'
import { useSubProjects } from '@/hooks/useSubProjects'
import { useStages } from '@/hooks/useStages'
import { cn, formatDate } from '@/lib/utils'
import type { TaskType, TaskPriority, TaskCategory, BigProject, SubProject, StageConfig } from '@/types'

const TYPE_OPTIONS: { key: TaskType; label: string; dot: string; color: string }[] = [
  { key: 'anytime', label: '随时进行', dot: 'bg-rose-400', color: 'rose' },
  { key: 'normal', label: '普通任务', dot: 'bg-amber-400', color: 'amber' },
  { key: 'longterm', label: '长线任务', dot: 'bg-sky-400', color: 'sky' },
  { key: 'recurring', label: '循环任务', dot: 'bg-emerald-400', color: 'emerald' }
]

const PRIORITY_OPTIONS: { key: TaskPriority; flag: string; label: string }[] = [
  { key: 'high', flag: '🔴', label: '高' },
  { key: 'medium', flag: '🟡', label: '中' },
  { key: 'low', flag: '🔵', label: '低' }
]

const RECURRENCE_OPTIONS: { label: string; value: string }[] = [
  { label: '每天', value: '{"type":"daily"}' },
  { label: '每周一', value: '{"type":"weekly","weekday":1}' },
  { label: '每月1日', value: '{"type":"monthly","day":1}' },
  { label: '每隔7天', value: '{"type":"custom","interval_days":7}' }
]

const TYPE_COLOR_CLASS: Record<string, string> = {
  rose: 'border-rose-300 bg-rose-50 text-rose-700',
  amber: 'border-amber-300 bg-amber-50 text-amber-700',
  sky: 'border-sky-300 bg-sky-50 text-sky-700',
  emerald: 'border-emerald-300 bg-emerald-50 text-emerald-700'
}

interface QuickTaskDialogProps {
  trigger?: React.ReactNode
  presetBigProjectId?: string
  presetSubProjectId?: string
  presetStage?: string
  lockProject?: boolean
}

export default function QuickTaskDialog({
  trigger,
  presetBigProjectId,
  presetSubProjectId,
  presetStage,
  lockProject
}: QuickTaskDialogProps) {
  const { data: profiles } = useProfiles()
  const createMutation = useCreateTask()
  const createRecord = useCreateWorkRecord()
  const [open, setOpen] = useState(false)

  const { data: bigProjects } = useBigProjects()
  const { data: categories } = useQuery({
    queryKey: ['task-categories-enabled'],
    queryFn: async (): Promise<TaskCategory[]> => {
      const { data, error } = await supabase
        .from('task_categories')
        .select('*')
        .eq('enabled', true)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as TaskCategory[]
    }
  })

  const [type, setType] = useState<TaskType>('anytime')
  const [categoryId, setCategoryId] = useState<string>('')
  const [assignee, setAssignee] = useState<string>('')
  const [due, setDue] = useState<string>('')
  const [dueEnd, setDueEnd] = useState<string>('')
  const [priority, setPriority] = useState<TaskPriority>('low')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [recurrenceRule, setRecurrenceRule] = useState<string>('')

  // 项目相关
  const [bigProjectId, setBigProjectId] = useState<string>(presetBigProjectId || '')
  const [subProjectId, setSubProjectId] = useState<string>(presetSubProjectId || '')
  const [stage, setStage] = useState<string>(presetStage || '')

  const { data: subProjects } = useSubProjects(bigProjectId || undefined)
  const { data: stages } = useStages()

  // 当 preset 变化时同步（例如从不同的小项目页面打开）
  useEffect(() => {
    if (presetBigProjectId) setBigProjectId(presetBigProjectId)
    if (presetSubProjectId) setSubProjectId(presetSubProjectId)
    if (presetStage) setStage(presetStage)
  }, [presetBigProjectId, presetSubProjectId, presetStage])

  // 切换大项目时清空小项目
  function handleBigProjectChange(v: string) {
    if (lockProject) return
    setBigProjectId(v)
    setSubProjectId('')
    setStage('')
  }

  function handleSubProjectChange(v: string) {
    if (lockProject) return
    setSubProjectId(v)
    const sp = (subProjects || []).find((s) => s.id === v) as SubProject | undefined
    if (sp?.stage) setStage(sp.stage)
  }

  const selCategory = categories?.find((c) => c.id === categoryId)
  const assigneeName = profiles?.find((p) => p.id === assignee)?.name

  const autoTitle = useMemo(() => {
    if (title.trim()) return title.trim()
    const parts: string[] = []
    if (selCategory) parts.push(selCategory.name)
    if (assigneeName) parts.push(assigneeName)
    return parts.join('-')
  }, [title, selCategory, assigneeName])

  useEffect(() => {
    if (type === 'anytime' || type === 'recurring') {
      setDue('')
      setDueEnd('')
    } else if (type === 'normal') {
      setDue(formatDate(new Date()))
      setDueEnd('')
    }
  }, [type])

  function reset() {
    setType('anytime')
    setCategoryId('')
    setAssignee('')
    setDue('')
    setDueEnd('')
    setPriority('low')
    setTitle('')
    setNote('')
    setRecurrenceRule('')
    if (!lockProject) {
      setBigProjectId('')
      setSubProjectId('')
      setStage('')
    }
  }

  async function handleSubmit() {
    if (!categoryId) {
      toast.error('请选择任务分类')
      return
    }
    if (!assignee) {
      toast.error('请选择负责人')
      return
    }
    if ((type === 'normal' || type === 'longterm') && !due) {
      toast.error('请选择日期')
      return
    }
    const dueIso = due ? new Date(due + 'T23:59:59').toISOString() : undefined
    const startDateIso = (type === 'longterm' && dueEnd) ? new Date(dueEnd + 'T00:00:00').toISOString() : undefined
    try {
      const task = await createMutation.mutateAsync({
        name: autoTitle,
        type,
        task_category_id: categoryId || undefined,
        big_project_id: bigProjectId || undefined,
        sub_project_id: subProjectId || undefined,
        stage: stage || undefined,
        assignee_id: assignee,
        due_date: dueIso,
        start_date: startDateIso,
        priority,
        description: note.trim() || undefined,
        recurrence_rule: type === 'recurring' && recurrenceRule ? recurrenceRule : undefined
      })
      await createRecord.mutateAsync({
        task_id: task.id,
        action: 'assign',
        content: '分配任务给 ' + (assigneeName || '员工')
      })
      toast.success('任务已创建')
      setOpen(false)
      reset()
    } catch (e: any) {
      toast.error(e?.message || '创建失败')
    }
  }

  const bigProjectName = (bigProjects || []).find((p) => p.id === bigProjectId)?.name
  const subProjectName = (subProjects || []).find((s) => s.id === subProjectId)?.name

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />新建任务
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>快速新建任务</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* 0. 所属项目（可选） */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              0. 所属项目（可选）{lockProject && <span className="ml-1 text-[10px] text-muted-foreground/70">·已锁定</span>}
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">大项目</div>
                {lockProject ? (
                  <div className="h-9 px-3 flex items-center text-xs border rounded-md bg-muted/30 truncate">
                    <Lock className="h-3 w-3 mr-1 shrink-0 text-muted-foreground" />
                    <span className="truncate">{bigProjectName || '-'}</span>
                  </div>
                ) : (
                  <Select value={bigProjectId} onValueChange={handleBigProjectChange}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="选大项目" /></SelectTrigger>
                    <SelectContent>
                      {(bigProjects || []).map((p: BigProject) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">小项目</div>
                {lockProject ? (
                  <div className="h-9 px-3 flex items-center text-xs border rounded-md bg-muted/30 truncate">
                    <Lock className="h-3 w-3 mr-1 shrink-0 text-muted-foreground" />
                    <span className="truncate">{subProjectName || '-'}</span>
                  </div>
                ) : (
                  <Select value={subProjectId} onValueChange={handleSubProjectChange} disabled={!bigProjectId}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="选小项目" /></SelectTrigger>
                    <SelectContent>
                      {(subProjects || []).map((s: SubProject) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">阶段</div>
                <Select value={stage} onValueChange={setStage} disabled={!bigProjectId}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="选阶段" /></SelectTrigger>
                  <SelectContent>
                    {(stages || []).map((s: StageConfig) => (
                      <SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 1. 任务类型 */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">1. 任务类型</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {TYPE_OPTIONS.map((t) => (
                <button key={t.key} type="button" onClick={() => setType(t.key)}
                  className={cn('flex flex-col items-center gap-0.5 p-2 rounded-lg border-2 transition-all',
                    type === t.key ? TYPE_COLOR_CLASS[t.color] : 'border-border hover:border-primary/50')}>
                  <span className={`h-2.5 w-2.5 rounded-full ${t.dot}`} />
                  <span className="text-[10px] font-medium text-center">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. 任务分类 */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">2. 任务分类</Label>
            <div className="flex flex-wrap gap-1.5">
              {(categories || []).map((cat) => (
                <button key={cat.id} type="button" onClick={() => setCategoryId(cat.id)}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                    categoryId === cat.id ? 'bg-primary text-white border-primary' : 'bg-card border-border hover:border-primary/50')}>
                  {cat.name}
                </button>
              ))}
              {(!categories || categories.length === 0) && (
                <span className="text-xs text-muted-foreground">暂无分类，请先在设置中添加</span>
              )}
            </div>
          </div>

          {/* 3. 负责人 */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">3. 负责人</Label>
            <div className="flex flex-wrap gap-1.5">
              {(profiles || []).map((p) => (
                <button key={p.id} type="button" onClick={() => setAssignee(p.id)}
                  className={cn('flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all',
                    assignee === p.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50')}>
                  <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                    {p.name?.slice(0, 1)}
                  </div>
                  <span className={cn('text-xs', assignee === p.id && 'text-primary font-medium')}>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. 日期 */}
          {type !== 'anytime' && (
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                4. 日期{type === 'recurring' ? '（循环规则）' : ''}
              </Label>
              {type === 'normal' && (
                <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="max-w-xs" />
              )}
              {type === 'longterm' && (
                <div className="grid grid-cols-2 gap-2 max-w-md">
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">开始</div>
                    <Input type="date" value={dueEnd} onChange={(e) => setDueEnd(e.target.value)} />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">截止</div>
                    <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
                  </div>
                </div>
              )}
              {type === 'recurring' && (
                <div className="flex flex-wrap gap-1.5">
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setRecurrenceRule(opt.value)}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                        recurrenceRule === opt.value ? 'bg-purple-500 text-white border-purple-500' : 'bg-card border-border hover:border-purple-400')}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. 优先级 */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              {type === 'anytime' ? '4' : '5'}. 优先级
            </Label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((p) => (
                <button key={p.key} type="button" onClick={() => setPriority(p.key)}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 transition-all',
                    priority === p.key ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50')}>
                  <span className="text-base">{p.flag}</span>
                  <span className={cn('text-xs', priority === p.key && 'text-primary font-medium')}>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 确认提交 */}
          <div className="space-y-2 border-t pt-3">
            <Label className="text-xs font-semibold text-muted-foreground">确认任务</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={autoTitle || '选了分类和负责人会自动生成'}
              className={cn(!title && autoTitle && 'bg-muted/30 italic')} />
            {!title && autoTitle && (
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                自动命名：<span className="font-medium text-foreground">{autoTitle}</span>
              </div>
            )}
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="补充说明（可选）" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="gap-1.5">
            {createMutation.isPending ? '创建中...' : (<><CheckCircle2 className="h-4 w-4" />创建任务</>)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
