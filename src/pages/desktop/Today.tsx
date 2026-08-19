import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ListTodo, Plus, Clock, Flag, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
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
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `还剩 ${days} 天`
  }
  if (hours > 0) {
    return `还剩 ${hours} 小时 ${minutes} 分`
  }
  return `还剩 ${minutes} 分钟`
}

const FILTER_OPTIONS: { key: FilterKey; label: string; statuses: TaskStatus[] }[] = [
  { key: 'all', label: '全部', statuses: [] },
  { key: 'todo', label: '待办', statuses: ['todo', 'paused'] },
  { key: 'doing', label: '进行中', statuses: ['doing', 'returned'] },
  { key: 'review', label: '待验收', statuses: ['review'] },
  { key: 'done', label: '已完成', statuses: ['done'] }
]

const PRIORITY_ORDER: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2
}

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

  const section3 = useMemo<Record<string, Task[]>>(() => {
    if (!tasks || !userId) return {}
    const mine = tasks.filter(
      (t) =>
        t.assignee_id === userId &&
        (isSameDay(t.due_date, today) || (!t.due_date && t.type === 'normal'))
    )
    const grouped: Record<string, Task[]> = {}
    filterByStatus(sortByPriority(mine)).forEach((t) => {
      if (!grouped[t.status]) grouped[t.status] = []
      grouped[t.status].push(t)
    })
    return grouped
  }, [tasks, filter, userId, today])

  const section4 = useMemo(() => {
    if (!tasks || !userId) return []
    return filterByStatus(
      sortByPriority(
        tasks.filter((t) => t.type === 'anytime' && t.status !== 'done' && t.assignee_id === userId)
      )
    )
  }, [tasks, filter, userId])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ListTodo className="h-6 w-6 text-teal-600" />
            今日待办
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{formatDateCN(today)}</p>
        </div>
        <Button onClick={() => navigate('/quick-task')}>
          <Plus className="h-4 w-4" />
          快速建任务
        </Button>
      </div>

      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2">
          {FILTER_OPTIONS.map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.key)}
              className="gap-1.5"
            >
              {f.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <Loading />
        </Card>
      ) : (
        <div className="space-y-5">
          <TaskSection
            title="🚩 红旗进行中任务"
            description="高优先级且正在进行的任务"
            accent="red"
            tasks={section1}
            onTaskClick={(id) => navigate(`/tasks/${id}`)}
            showCountdown={false}
          />

          <TaskSection
            title="⏰ 今日到期任务"
            description="今天截止但尚未完成的任务"
            accent="amber"
            tasks={section2}
            onTaskClick={(id) => navigate(`/tasks/${id}`)}
            showCountdown={true}
          />

          <MyTasksSection
            grouped={section3}
            onTaskClick={(id) => navigate(`/tasks/${id}`)}
          />

          <TaskSection
            title="🔵 随时进行任务"
            description="没有截止日期、随时可以处理的任务"
            accent="slate"
            tasks={section4}
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
      className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-1 pt-0.5 shrink-0">
        <Flag className={cn(
          'h-4 w-4',
          task.priority === 'high' && 'text-red-500',
          task.priority === 'medium' && 'text-amber-500',
          task.priority === 'low' && 'text-slate-400'
        )} />
        <span className="text-sm">{PRIORITY_FLAGS[task.priority]?.replace(/[^🚩🏁🔵]/g, '') || ''}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className={cn(
              'font-medium text-slate-800 truncate',
              overdue && 'text-red-600'
            )}>
              {task.name}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={cn(
                'text-[11px] px-2 py-0.5 rounded-full font-medium',
                overdue && task.status !== 'delayed' ? 'bg-red-50 text-red-700' : statusMeta.color
              )}>
                {overdue && task.status !== 'delayed' ? '已逾期' : statusMeta.label}
              </span>
              {task.due_date && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(task.due_date)}
                </span>
              )}
              {showCountdown && countdown && (
                <span className={cn(
                  'text-[11px] px-2 py-0.5 rounded-full font-medium',
                  countdown === '已逾期' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
                )}>
                  {countdown}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <div className="text-xs text-slate-500 mt-1">
              {description}（{tasks.length}）
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-sm text-slate-400 py-6 text-center">暂无任务</div>
        ) : (
          tasks.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              onClick={onTaskClick}
              showCountdown={showCountdown}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}

function MyTasksSection({
  grouped,
  onTaskClick
}: {
  grouped: Record<string, Task[]>
  onTaskClick: (id: string) => void
}) {
  const total = Object.values(grouped).reduce((s, arr) => s + arr.length, 0)
  const hasAny = total > 0

  return (
    <Card className="border-l-4 border-l-teal-400">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">👤 我被分配的今日待办</CardTitle>
            <div className="text-xs text-slate-500 mt-1">按状态分组展示（{total}）</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasAny ? (
          <div className="text-sm text-slate-400 py-6 text-center">暂无分配给你的任务</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([status, list]) => {
              const meta = TASK_STATUS_LABELS[status] || TASK_STATUS_LABELS.todo
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      meta.color
                    )}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-slate-400">（{list.length}）</span>
                  </div>
                  <div className="space-y-2 pl-2 border-l-2 border-slate-100">
                    {list.map((t) => (
                      <TaskItem
                        key={t.id}
                        task={t}
                        onClick={onTaskClick}
                        showCountdown={false}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
