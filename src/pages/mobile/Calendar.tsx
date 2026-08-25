import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Loading from '@/components/Loading'
import { useTasks } from '@/hooks/useTasks'
import { PRIORITY_FLAGS, TASK_STATUS_LABELS } from '@/lib/settings'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import type { Task } from '@/types'

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

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

const STATUS_DOT_COLORS: Record<string, string> = {
  todo: 'bg-slate-400',
  doing: 'bg-blue-500',
  review: 'bg-purple-500',
  done: 'bg-emerald-500',
  delayed: 'bg-red-500',
  returned: 'bg-orange-500',
  paused: 'bg-amber-500'
}

const PRIORITY_SHORT_FLAGS: Record<string, string> = {
  high: '🚩',
  medium: '🏁',
  low: '🔵'
}

type ViewMode = 'month' | 'day'

export default function CalendarPage() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [cursorDate, setCursorDate] = useState<Date>(new Date())

  const { data: tasks, isLoading } = useTasks()

  const today = useMemo(() => new Date(), [])

  const sortedTasks = useMemo(() => {
    if (!tasks) return []
    return [...tasks].sort((a, b) => {
      const ad = a.start_date || a.due_date || a.created_at
      const bd = b.start_date || b.due_date || b.created_at
      return new Date(ad).getTime() - new Date(bd).getTime()
    })
  }, [tasks])

  function goPrev() {
    const d = new Date(cursorDate)
    if (viewMode === 'day') d.setDate(d.getDate() - 1)
    else d.setMonth(d.getMonth() - 1)
    setCursorDate(d)
  }

  function goNext() {
    const d = new Date(cursorDate)
    if (viewMode === 'day') d.setDate(d.getDate() + 1)
    else d.setMonth(d.getMonth() + 1)
    setCursorDate(d)
  }

  function goToday() {
    setCursorDate(new Date())
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />日历
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">{formatDateCN(cursorDate)}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={goToday}>今天</Button>
        <div className="flex items-center border rounded-lg overflow-hidden">
          <Button variant="ghost" size="icon" onClick={goPrev} className="rounded-none border-r h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goNext} className="rounded-none h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center border rounded-lg overflow-hidden ml-auto">
          <Button
            variant={viewMode === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('month')}
            className="rounded-none border-r h-8 text-xs"
          >月</Button>
          <Button
            variant={viewMode === 'day' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('day')}
            className="rounded-none h-8 text-xs"
          >日</Button>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <Loading />
        ) : viewMode === 'month' ? (
          <MonthView cursorDate={cursorDate} today={today} tasks={sortedTasks} onTaskClick={(id) => navigate(`/tasks/${id}`)} />
        ) : (
          <DayView cursorDate={cursorDate} tasks={sortedTasks} onTaskClick={(id) => navigate(`/tasks/${id}`)} />
        )}
      </Card>
    </div>
  )
}

function MonthView({
  cursorDate,
  today,
  tasks,
  onTaskClick
}: {
  cursorDate: Date
  today: Date
  tasks: Task[]
  onTaskClick: (id: string) => void
}) {
  const year = cursorDate.getFullYear()
  const month = cursorDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()

  const days: Date[] = []
  const startDate = new Date(year, month, 1 - startOffset)
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    days.push(d)
  }

  const weekdays = ['日', '一', '二', '三', '四', '五', '六']

  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {}
    tasks.forEach((t) => {
      const key = formatDate(t.due_date)
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    return map
  }, [tasks])

  return (
    <div className="p-3">
      <div className="mb-2 text-base font-semibold">{year}年 {month + 1}月</div>
      <div className="grid grid-cols-7 border-b border-r border-border">
        {weekdays.map((w) => (
          <div key={w} className="py-1.5 text-center text-[10px] font-semibold text-muted-foreground border-l border-t border-border">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-b border-r border-border">
        {days.map((d, idx) => {
          const inMonth = isSameMonth(d, cursorDate)
          const isToday = isSameDay(d, today)
          const dayTasks = tasksByDay[formatDate(d)] || []
          const topTasks = dayTasks.slice(0, 2)
          return (
            <div
              key={idx}
              className={cn(
                'min-h-[70px] border-l border-t border-border p-1 flex flex-col gap-0.5',
                !inMonth && 'bg-muted/30'
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'text-[10px] font-medium w-5 h-5 flex items-center justify-center rounded-full',
                    isToday && 'bg-primary text-white',
                    !isToday && inMonth && 'text-foreground',
                    !isToday && !inMonth && 'text-muted-foreground/60'
                  )}
                >
                  {d.getDate()}
                </span>
                {dayTasks.length > 2 && (
                  <span className="text-[9px] text-muted-foreground">+{dayTasks.length - 2}</span>
                )}
              </div>
              <div className="space-y-0.5 flex-1">
                {topTasks.map((t) => {
                  const overdue = t.status !== 'done' && isOverdue(t.due_date)
                  return (
                    <div
                      key={t.id}
                      onClick={() => onTaskClick(t.id)}
                      className={cn(
                        'text-[10px] px-1 py-0.5 rounded cursor-pointer line-clamp-1 flex items-center gap-0.5',
                        overdue ? 'bg-red-50 text-red-700' : 'bg-muted/60'
                      )}
                    >
                      <span className={cn('w-1 h-1 rounded-full shrink-0', STATUS_DOT_COLORS[t.status] || 'bg-slate-400')} />
                      <span className="truncate">{t.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DayView({
  cursorDate,
  tasks,
  onTaskClick
}: {
  cursorDate: Date
  tasks: Task[]
  onTaskClick: (id: string) => void
}) {
  const dayTasks = useMemo(() => {
    return tasks.filter((t) => isSameDay(t.due_date, cursorDate))
  }, [tasks, cursorDate])

  return (
    <div className="p-3">
      <div className="mb-3 text-base font-semibold">
        {cursorDate.getMonth() + 1}月{cursorDate.getDate()}日 任务
      </div>
      {dayTasks.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">当天没有任务</div>
      ) : (
        <div className="space-y-2">
          {dayTasks.map((t) => {
            const statusMeta = TASK_STATUS_LABELS[t.status] || TASK_STATUS_LABELS.todo
            const overdue = t.status !== 'done' && isOverdue(t.due_date)
            return (
              <div
                key={t.id}
                onClick={() => onTaskClick(t.id)}
                className="px-3 py-2.5 cursor-pointer rounded-lg border hover:border-primary active:bg-muted/40 flex items-start gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>{PRIORITY_FLAGS[t.priority] || ''}</span>
                    <span className={cn('font-medium text-sm truncate', overdue && 'text-red-600')}>
                      {t.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', statusMeta.color)}>
                      {overdue ? '已逾期' : statusMeta.label}
                    </span>
                    {t.start_date && (
                      <span className="text-[10px] text-muted-foreground">开始 {formatDate(t.start_date)}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
