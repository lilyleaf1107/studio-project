import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Loading from '@/components/Loading'
import { useTasks } from '@/hooks/useTasks'
import { PRIORITY_FLAGS, TASK_STATUS_LABELS } from '@/lib/settings'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import type { Task } from '@/types'

type ViewMode = 'year' | 'month' | 'day'

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

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function isSameYear(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
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
    else if (viewMode === 'month') d.setMonth(d.getMonth() - 1)
    else d.setFullYear(d.getFullYear() - 1)
    setCursorDate(d)
  }

  function goNext() {
    const d = new Date(cursorDate)
    if (viewMode === 'day') d.setDate(d.getDate() + 1)
    else if (viewMode === 'month') d.setMonth(d.getMonth() + 1)
    else d.setFullYear(d.getFullYear() + 1)
    setCursorDate(d)
  }

  function goToday() {
    setCursorDate(new Date())
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-teal-600" />
            日历
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDateCN(cursorDate)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            今天
          </Button>
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button variant="ghost" size="icon" onClick={goPrev} className="rounded-none border-r h-9 w-9">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={goNext} className="rounded-none h-9 w-9">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'year' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('year')}
              className="rounded-none border-r"
            >
              年视图
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className="rounded-none border-r"
            >
              月视图
            </Button>
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('day')}
              className="rounded-none"
            >
              日视图
            </Button>
          </div>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <Loading />
        ) : viewMode === 'month' ? (
          <MonthView
            cursorDate={cursorDate}
            today={today}
            tasks={sortedTasks}
            onTaskClick={(id) => navigate(`/tasks/${id}`)}
          />
        ) : viewMode === 'day' ? (
          <DayView
            cursorDate={cursorDate}
            tasks={sortedTasks}
            onTaskClick={(id) => navigate(`/tasks/${id}`)}
          />
        ) : (
          <YearView
            cursorDate={cursorDate}
            today={today}
            tasks={sortedTasks}
            onMonthClick={(m) => {
              setCursorDate(m)
              setViewMode('month')
            }}
          />
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
    <div className="p-4">
      <div className="mb-4 text-lg font-semibold text-slate-800">
        {year}年 {month + 1}月
      </div>
      <div className="grid grid-cols-7 border-b border-r border-slate-200">
        {weekdays.map((w) => (
          <div
            key={w}
            className="py-2 text-center text-xs font-semibold text-slate-500 border-l border-t border-slate-200"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-b border-r border-slate-200">
        {days.map((d, idx) => {
          const inMonth = isSameMonth(d, cursorDate)
          const isToday = isSameDay(d, today)
          const dayTasks = tasksByDay[formatDate(d)] || []
          const topTasks = dayTasks.slice(0, 2)

          return (
            <div
              key={idx}
              className={cn(
                'min-h-[110px] border-l border-t border-slate-200 p-1.5 flex flex-col gap-1',
                !inMonth && 'bg-slate-50/60'
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                    isToday && 'bg-teal-600 text-white',
                    !isToday && inMonth && 'text-slate-700',
                    !isToday && !inMonth && 'text-slate-400'
                  )}
                >
                  {d.getDate()}
                </span>
                {dayTasks.length > 2 && (
                  <span className="text-[10px] text-slate-400">+{dayTasks.length - 2}</span>
                )}
              </div>
              <div className="space-y-1 flex-1">
                {topTasks.map((t) => {
                  const overdue = t.status !== 'done' && isOverdue(t.due_date)
                  return (
                    <div
                      key={t.id}
                      onClick={() => onTaskClick(t.id)}
                      className={cn(
                        'text-[11px] px-1.5 py-1 rounded cursor-pointer hover:bg-slate-100 line-clamp-1 flex items-center gap-1',
                        overdue && 'bg-red-50'
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT_COLORS[t.status] || 'bg-slate-400')} />
                      <span className="shrink-0">{PRIORITY_SHORT_FLAGS[t.priority] || ''}</span>
                      <span className={cn('truncate', overdue && 'text-red-600')}>{t.name}</span>
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
  const hours = Array.from({ length: 13 }, (_, i) => i + 8)

  const dayTasks = useMemo(() => {
    return tasks.filter((t) => isSameDay(t.due_date, cursorDate))
  }, [tasks, cursorDate])

  return (
    <div className="p-4">
      <div className="mb-4 text-lg font-semibold text-slate-800">
        {cursorDate.getMonth() + 1}月{cursorDate.getDate()}日 当天任务
      </div>
      <div className="flex">
        <div className="w-20 shrink-0 border-r border-slate-200">
          {hours.map((h) => (
            <div
              key={h}
              className="h-14 text-xs text-slate-400 pr-3 text-right pt-0.5 border-b border-slate-100"
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          {dayTasks.length === 0 ? (
            <div className="h-[182px] flex items-center justify-center text-sm text-slate-400 border-b border-slate-100">
              当天没有任务
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {dayTasks.map((t) => {
                const statusMeta = TASK_STATUS_LABELS[t.status] || TASK_STATUS_LABELS.todo
                const overdue = t.status !== 'done' && isOverdue(t.due_date)
                return (
                  <div
                    key={t.id}
                    onClick={() => onTaskClick(t.id)}
                    className="px-4 py-3 cursor-pointer hover:bg-slate-50/80 flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{PRIORITY_FLAGS[t.priority] || ''}</span>
                        <span className={cn(
                          'font-medium truncate',
                          overdue && 'text-red-600'
                        )}>
                          {t.name}
                        </span>
                        <span className={cn(
                          'text-[11px] px-2 py-0.5 rounded-full font-medium',
                          statusMeta.color
                        )}>
                          {overdue ? '已逾期' : statusMeta.label}
                        </span>
                      </div>
                      {t.start_date && (
                        <div className="text-xs text-slate-400 mt-1">
                          开始: {formatDate(t.start_date)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function YearView({
  cursorDate,
  today,
  tasks,
  onMonthClick
}: {
  cursorDate: Date
  today: Date
  tasks: Task[]
  onMonthClick: (monthDate: Date) => void
}) {
  const year = cursorDate.getFullYear()

  const taskDaysByMonth = useMemo(() => {
    const map: Record<number, Set<number>> = {}
    for (let m = 0; m < 12; m++) map[m] = new Set()
    tasks.forEach((t) => {
      if (!t.due_date) return
      const d = new Date(t.due_date)
      if (d.getFullYear() !== year) return
      map[d.getMonth()].add(d.getDate())
    })
    return map
  }, [tasks, year])

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']

  return (
    <div className="p-4">
      <div className="mb-4 text-lg font-semibold text-slate-800">{year}年</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 12 }, (_, m) => {
          const firstDay = new Date(year, m, 1)
          const offset = firstDay.getDay()
          const daysInMonth = new Date(year, m + 1, 0).getDate()
          const taskDays = taskDaysByMonth[m]

          const cells: (number | null)[] = []
          for (let i = 0; i < offset; i++) cells.push(null)
          for (let d = 1; d <= daysInMonth; d++) cells.push(d)
          while (cells.length % 7 !== 0) cells.push(null)

          const isCurrentMonth = isSameMonth(new Date(year, m, 1), today)

          return (
            <div
              key={m}
              onClick={() => onMonthClick(new Date(year, m, 1))}
              className={cn(
                'border rounded-xl p-3 cursor-pointer transition-colors',
                isCurrentMonth ? 'border-teal-300 bg-teal-50/40 hover:bg-teal-50' : 'border-slate-200 hover:bg-slate-50'
              )}
            >
              <div className="text-sm font-semibold mb-2 text-slate-700">{monthNames[m]}</div>
              <div className="grid grid-cols-7 gap-0.5 text-[10px] text-slate-400 mb-1">
                {weekdays.map((w) => (
                  <div key={w} className="text-center">{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((d, idx) => {
                  if (d === null) return <div key={idx} />
                  const isToday = isSameDay(new Date(year, m, d), today)
                  const hasTask = taskDays.has(d)
                  return (
                    <div
                      key={idx}
                      className={cn(
                        'aspect-square flex items-center justify-center relative rounded text-[11px]',
                        isToday && 'bg-teal-600 text-white font-medium'
                      )}
                    >
                      {d}
                      {hasTask && !isToday && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-500" />
                      )}
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
