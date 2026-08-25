import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sparkles, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { useProfiles } from '@/hooks/useProfiles'
import { useCreateTask } from '@/hooks/useTasks'
import { useCreateWorkRecord } from '@/hooks/useWorkRecords'
import { cn, formatDate } from '@/lib/utils'
import type { TaskType, TaskPriority, TaskCategory } from '@/types'

const TYPE_OPTIONS: { key: TaskType; label: string; icon: string }[] = [
  { key: 'anytime', label: '随时进行', icon: '🟤' },
  { key: 'normal', label: '普通任务', icon: '🟢' },
  { key: 'longterm', label: '长线任务', icon: '🟣' },
  { key: 'recurring', label: '循环任务', icon: '🟠' }
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

export default function QuickTask() {
  const { data: profiles } = useProfiles()
  const createMutation = useCreateTask()
  const createRecord = useCreateWorkRecord()

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
        content: `分配任务给 ${assigneeName || '员工'}，优先级 ${priority === 'high' ? '高' : priority === 'medium' ? '中' : '低'}`
      })
      toast.success(`任务「${autoTitle}」已创建`)
      setCategoryId('')
      setAssignee('')
      setTitle('')
      setNote('')
      setPriority('low')
      setType('anytime')
    } catch (e: any) {
      toast.error(e?.message || '创建失败')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />快速建任务
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">点几下就建好，不用打字</p>
      </div>

      {/* 1. 任务类型 */}
      <Card>
        <CardContent className="p-3">
          <div className="text-xs font-semibold text-muted-foreground mb-2">1. 任务类型</div>
          <div className="grid grid-cols-4 gap-1.5">
            {TYPE_OPTIONS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all',
                  type === t.key
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border active:border-primary/50'
                )}
              >
                <span className="text-lg">{t.icon}</span>
                <span className={cn('text-[10px] font-medium text-center', type === t.key && 'text-primary')}>{t.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. 任务分类 */}
      <Card>
        <CardContent className="p-3">
          <div className="text-xs font-semibold text-muted-foreground mb-2">2. 任务分类</div>
          <div className="flex flex-wrap gap-1.5">
            {(categories || []).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  categoryId === cat.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-card border-border active:border-primary/50'
                )}
              >
                {cat.name}
              </button>
            ))}
            {(!categories || categories.length === 0) && (
              <span className="text-xs text-muted-foreground">暂无分类，请先在设置中添加</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. 负责人 */}
      <Card>
        <CardContent className="p-3">
          <div className="text-xs font-semibold text-muted-foreground mb-2">3. 负责人</div>
          <div className="flex flex-wrap gap-1.5">
            {(profiles || []).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setAssignee(p.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all',
                  assignee === p.id
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border active:border-primary/50'
                )}
              >
                <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                  {p.name?.slice(0, 1)}
                </div>
                <span className={cn('text-xs', assignee === p.id && 'text-primary font-medium')}>{p.name}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. 日期 */}
      {type !== 'anytime' && (
        <Card>
          <CardContent className="p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              4. 日期{type === 'recurring' ? '（循环规则）' : ''}
            </div>
            {type === 'normal' && (
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            )}
            {type === 'longterm' && (
              <div className="grid grid-cols-2 gap-2">
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
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRecurrenceRule(opt.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      recurrenceRule === opt.value
                        ? 'bg-purple-500 text-white border-purple-500'
                        : 'bg-card border-border active:border-purple-400'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5. 优先级 */}
      <Card>
        <CardContent className="p-3">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            {type === 'anytime' ? '4' : '5'}. 优先级
          </div>
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPriority(p.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 transition-all flex-1 justify-center',
                  priority === p.key
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border active:border-primary/50'
                )}
              >
                <span className="text-base">{p.flag}</span>
                <span className={cn('text-xs', priority === p.key && 'text-primary font-medium')}>{p.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 确认提交 */}
      <Card>
        <CardContent className="p-3 space-y-2.5">
          <div className="text-xs font-semibold text-muted-foreground">确认任务</div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={autoTitle || '选了分类和负责人会自动生成'}
            className={cn(!title && 'bg-muted/30 italic')}
          />
          {!title && autoTitle && (
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              自动命名：<span className="font-medium text-foreground">{autoTitle}</span>
            </div>
          )}
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="补充说明（可选）"
          />
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="gap-1.5 w-full"
          >
            {createMutation.isPending ? '创建中...' : (
              <>
                <CheckCircle2 className="h-4 w-4" />创建任务
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
