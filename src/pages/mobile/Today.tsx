import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListTodo, Plus, Clock, Flag, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Loading from '@/components/Loading'
import { useTasks } from '@/hooks/useTasks'
import { useAuthStore } from '@/store/auth'
import { PRIORITY_FLAGS, TASK_STATUS_LABELS } from '@/lib/settings'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types'

type FilterKey = 'all' | 'todo' | 'doing' | 'review' | 'done'

function formatDateCN(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const w = weekdays[d.getDay()]
  return `${y}年${m}月${day}日 ${w}`
}

function isSameDay(a?: string | Date | null, b?: string | Date | null): boolean {
  if (!a || !b) return false
  const da = typeof a === 'string' ? new Date(a) : a
  const db = typeof b === 'string' ? new Date(b) : b
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

function getCountdown(due?: string): string {
  if (!due) return ''
  const now = new Date()
  const endOfDay = new Date(due)
  endOfDay.setHours(23, 59, 59, 999)
  const diff = endOfDay.getTime() - now.getTime()
  if (diff <= 0) return '已逾期'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `还剩 ${days} 天`
  }
  if (hours > 0) return `还剩 ${hours} 小时`
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `还剩 ${minutes} 分钟`
}

const FILTER_OPTIONS: { key: FilterKey; label: string; statuses: TaskStatus[] }[] = [
  { key: 'all', label: '全部', statuses: [] },
  { key: 'todo', label: '待办', statuses: ['todo', 'paused'] },
  { key: 'doing', label: '进行中', statuses: ['doing', 'returned'] },
  { key: 'review', label: '待验收', statuses: ['review'] },
  { key: 'done', label: '已完成', statuses: ['done'] }
]

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

export default function TodayPage() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const userId = profile?.id
  const [filter, setFilter] = useState<FilterKey>('all')

  const { data: tasks, isLoading } = useTasks()
  const today = useMemo(() => new Date(), [])

  const filterByStatus = (list: Task[]): Task[] => {
    const opt = FILTER_OPTIONS.find((f) => f.key === filter)
    if (!opt || opt.key === 'all') return list
    return list.filter((t) => opt.statuses.includes(t.status))
  }

  const sortByPriority = (list: Task[]): Task[] => {
    return [...list].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
  }

  const section1 = useMemo(() => {
    if (!tasks) return []
    return filterByStatus(
      sortByPriority(
        tasks.filter((t) => t.priority === 'high' && (t.status === 'doing' || t.status === 'returned'))
      )
    )
  }, [tasks, filter])

  const section2 = useMemo(() => {
    if (!tasks) return []
    return filterByStatus(
      sortByPriority(
        tasks.filter((t) => isSameDay(t.due_date, today) && t.status !== 'done')
      )
    )
  }, [tasks, filter, today])

  const section3 = useMemo(() => {
    if (!tasks || !userId) return []
    return filterByStatus(
      sortByPriority(
        tasks.filter((t) => t.type === 'anytime' && t.status !== 'done' && t.assignee_id === userId)
      )
    )
  }, [tasks, filter, userId])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />今日待办
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{formatDateCN(today)}</p>
        </div>
        <Button size="sm" onClick={() => navigate('/quick-task')}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* 筛选 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTER_OPTIONS.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.key)}
            className="gap-1 shrink-0 h-8 text-xs"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Loading />
      ) : (
        <div className="space-y-4">
          <TaskSection
            title="🚩 红旗进行中"
            description="高优先级进行中"
            accent="red"
            tasks={section1}
            onTaskClick={(id) => navigate(`/tasks/${id}`)}
            showCountdown={false}
          />
          <TaskSection
            title="⏰ 今日到期"
            description="今天截止未完成"
            accent="amber"
            tasks={section2}
            onTaskClick={(id) => navigate(`/tasks/${id}`)}
            showCountdown={true}
          />
          <TaskSection
            title="🔵 随时进行"
            description="无截止随时处理"
            accent="slate"
            tasks={section3}
            onTaskClick={(id) => navigate(`/tasks/${id}`)}
            showCountdown={false}
          />
        </div>
      )}
    </div>
  )
}

function TaskItem({
  task,
  onClick,
  showCountdown
}: {
  task: Task
  onClick: (id: string) => void
  showCountdown: boolean
}) {
  const statusMeta = TASK_STATUS_LABELS[task.status] || TASK_STATUS_LABELS.todo
  const overdue = task.status !== 'done' && isOverdue(task.due_date)
  const countdown = showCountdown ? getCountdown(task.due_date) : ''

  return (
    <div
      onClick={() => onClick(task.id)}
      className="flex items-start gap-2 p-2.5 rounded-lg border active:bg-muted/40 cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-1 pt-0.5 shrink-0">
        <Flag className={cn(
          'h-3.5 w-3.5',
          task.priority === 'high' && 'text-red-500',
          task.priority === 'medium' && 'text-amber-500',
          task.priority === 'low' && 'text-slate-400'
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className={cn('font-medium text-sm truncate', overdue && 'text-red-600')}>
              {task.name}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                overdue && task.status !== 'delayed' ? 'bg-red-50 text-red-700' : statusMeta.color
              )}>
                {overdue && task.status !== 'delayed' ? '已逾期' : statusMeta.label}
              </span>
              {task.due_date && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDate(task.due_date)}
                </span>
              )}
              {showCountdown && countdown && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                  countdown === '已逾期' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
                )}>
                  {countdown}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
        </div>
      </div>
    </div>
  )
}

function TaskSection({
  title,
  description,
  accent,
  tasks,
  onTaskClick,
  showCountdown
}: {
  title: string
  description: string
  accent: 'red' | 'amber' | 'slate' | 'teal'
  tasks: Task[]
  onTaskClick: (id: string) => void
  showCountdown: boolean
}) {
  const accentStyles: Record<string, string> = {
    red: 'border-l-red-400',
    amber: 'border-l-amber-400',
    slate: 'border-l-slate-400',
    teal: 'border-l-teal-400'
  }

  return (
    <Card className={cn('border-l-4', accentStyles[accent])}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-medium text-sm">{title}</div>
          <span className="text-[10px] text-muted-foreground">{tasks.length}</span>
        </div>
        {tasks.length === 0 ? (
          <div className="text-xs text-muted-foreground py-4 text-center">暂无任务</div>
        ) : (
          tasks.map((t) => (
            <TaskItem key={t.id} task={t} onClick={onTaskClick} showCountdown={showCountdown} />
          ))
        )}
      </CardContent>
    </Card>
  )
}
