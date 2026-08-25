import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ListTodo,
  Clock,
  BarChart3,
  CalendarDays,
  CalendarRange,
  Plus
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { useTasks } from '@/hooks/useTasks'
import { usePersonalEvents } from '@/hooks/usePersonalEvents'
import { PRIORITY_FLAGS, TASK_STATUS_LABELS } from '@/lib/settings'
import GanttChart from '@/components/schedule/GanttChart'
import TimelineView from '@/components/schedule/TimelineView'
import { WeekView, MonthView, YearView } from '@/components/schedule/CalendarViews'
import QuickEventDialog from '@/components/QuickEventDialog'
import type { Task, PersonalEvent } from '@/types'

type ViewMode = 'day' | 'week' | 'month' | 'year' | 'timeline' | 'gantt'

const VIEW_OPTIONS: { key: ViewMode; label: string; icon: any }[] = [
  { key: 'day', label: '日', icon: ListTodo },
  { key: 'week', label: '周', icon: CalendarRange },
  { key: 'month', label: '月', icon: CalendarDays },
  { key: 'year', label: '年', icon: CalendarIcon },
  { key: 'timeline', label: '时间轴', icon: Clock },
  { key: 'gantt', label: '甘特图', icon: BarChart3 }
]

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
  return da.toDateString() === db.toDateString()
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

export default function SchedulePage() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [cursorDate, setCursorDate] = useState<Date>(new Date())

  const today = useMemo(() => new Date(), [])

  const range = useMemo(() => {
    const start = new Date(cursorDate)
    start.setMonth(start.getMonth() - 1)
    const end = new Date(cursorDate)
    end.setMonth(end.getMonth() + 2)
    return {
      start: formatDate(start),
      end: formatDate(end)
    }
  }, [cursorDate])

  const { data: tasks } = useTasks()
  const { data: events } = usePersonalEvents(range)

  function goPrev() {
    const d = new Date(cursorDate)
    if (viewMode === 'day') d.setDate(d.getDate() - 1)
    else if (viewMode === 'week') d.setDate(d.getDate() - 7)
    else if (viewMode === 'month' || viewMode === 'timeline' || viewMode === 'gantt') d.setMonth(d.getMonth() - 1)
    else if (viewMode === 'year') d.setFullYear(d.getFullYear() - 1)
    setCursorDate(d)
  }

  function goNext() {
    const d = new Date(cursorDate)
    if (viewMode === 'day') d.setDate(d.getDate() + 1)
    else if (viewMode === 'week') d.setDate(d.getDate() + 7)
    else if (viewMode === 'month' || viewMode === 'timeline' || viewMode === 'gantt') d.setMonth(d.getMonth() + 1)
    else if (viewMode === 'year') d.setFullYear(d.getFullYear() + 1)
    setCursorDate(d)
  }

  function goToday() {
    setCursorDate(new Date())
  }

  const title = useMemo(() => {
    const y = cursorDate.getFullYear()
    const m = cursorDate.getMonth() + 1
    if (viewMode === 'year') return `${y}年`
    if (viewMode === 'week') {
      const start = new Date(cursorDate)
      start.setDate(start.getDate() - start.getDay())
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`
    }
    return `${y}年${m}月`
  }, [cursorDate, viewMode])

  return (
    <div className="space-y-4">
      {/* 顶部操作 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">日程</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {viewMode === 'day' ? formatDateCN(cursorDate) : title}
          </p>
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
          <QuickEventDialog
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />新建事件
              </Button>
            }
            defaultDate={cursorDate}
          />
        </div>
      </div>

      {/* 视图切换 */}
      <div className="flex items-center border rounded-lg overflow-hidden w-fit">
        {VIEW_OPTIONS.map((opt) => (
          <Button
            key={opt.key}
            variant={viewMode === opt.key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode(opt.key)}
            className="rounded-none gap-1.5 h-8 text-xs border-r last:border-r-0"
          >
            <opt.icon className="h-3.5 w-3.5" />
            {opt.label}
          </Button>
        ))}
      </div>

      {/* 内容区 */}
      <Card>
        <CardContent className="p-4">
          {viewMode === 'day' && (
            <DayView cursorDate={cursorDate} tasks={tasks || []} events={events || []} onTaskClick={(id) => navigate(`/tasks/${id}`)} />
          )}
          {viewMode === 'week' && (
            <WeekView cursorDate={cursorDate} tasks={tasks || []} events={events || []} onTaskClick={(id) => navigate(`/tasks/${id}`)} />
          )}
          {viewMode === 'month' && (
            <MonthView cursorDate={cursorDate} tasks={tasks || []} events={events || []} onTaskClick={(id) => navigate(`/tasks/${id}`)} />
          )}
          {viewMode === 'year' && (
            <YearView
              cursorDate={cursorDate}
              tasks={tasks || []}
              events={events || []}
              onMonthClick={(m) => {
                const d = new Date(cursorDate)
                d.setMonth(m)
                setCursorDate(d)
                setViewMode('month')
              }}
            />
          )}
          {viewMode === 'timeline' && (
            <TimelineView date={cursorDate} tasks={tasks || []} events={events || []} onTaskClick={(id) => navigate(`/tasks/${id}`)} />
          )}
          {viewMode === 'gantt' && (
            <GanttChart tasks={tasks || []} events={events || []} onTaskClick={(id) => navigate(`/tasks/${id}`)} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// 日视图
function DayView({
  cursorDate,
  tasks,
  events,
  onTaskClick
}: {
  cursorDate: Date
  tasks: Task[]
  events: PersonalEvent[]
  onTaskClick: (id: string) => void
}) {
  const dayTasks = tasks.filter((t) => isSameDay(t.due_date, cursorDate) && t.status !== 'done')
  const dayEvents = events.filter((e) => e.event_date === formatDate(cursorDate))

  const sortedTasks = [...dayTasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* 今日任务 */}
        <div>
          <div className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <ListTodo className="h-4 w-4 text-primary" />今日任务（{sortedTasks.length}）
          </div>
          {sortedTasks.length === 0 ? (
            <div className="text-xs text-muted-foreground py-6 text-center border rounded-lg border-dashed">
              今天没有任务
            </div>
          ) : (
            <div className="space-y-1.5">
              {sortedTasks.map((t) => {
                const statusMeta = TASK_STATUS_LABELS[t.status] || TASK_STATUS_LABELS.todo
                const overdue = isOverdue(t.due_date)
                return (
                  <div
                    key={t.id}
                    onClick={() => onTaskClick(t.id)}
                    className="flex items-center gap-2 p-2 rounded-lg border hover:border-primary cursor-pointer"
                  >
                    <span>{PRIORITY_FLAGS[t.priority]}</span>
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-sm font-medium truncate', overdue && 'text-red-600')}>{t.name}</div>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', statusMeta.color)}>
                        {overdue ? '已逾期' : statusMeta.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 今日事件 */}
        <div>
          <div className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4 text-emerald-500" />今日事件（{dayEvents.length}）
          </div>
          {dayEvents.length === 0 ? (
            <div className="text-xs text-muted-foreground py-6 text-center border rounded-lg border-dashed">
              今天没有事件
            </div>
          ) : (
            <div className="space-y-1.5">
              {dayEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-2 p-2 rounded-lg border bg-emerald-50/50 border-emerald-200">
                  <Clock className="h-3.5 w-3.5 text-emerald-600" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.title}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {e.start_time || '全天'}{e.end_time ? ` - ${e.end_time}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}