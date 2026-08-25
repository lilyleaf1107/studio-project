import { useMemo } from 'react'
import { cn, formatDate } from '@/lib/utils'
import type { Task, PersonalEvent } from '@/types'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

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

interface CalendarItem {
  id: string
  title: string
  date: string
  type: 'task' | 'event'
  color?: string
  status?: string
}

const EVENT_COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700',
  sky: 'bg-sky-100 text-sky-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  violet: 'bg-violet-100 text-violet-700'
}

const TASK_COLOR_MAP: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-700',
  doing: 'bg-blue-100 text-blue-700',
  review: 'bg-purple-100 text-purple-700',
  done: 'bg-emerald-100 text-emerald-700',
  delayed: 'bg-red-100 text-red-700',
  returned: 'bg-orange-100 text-orange-700',
  paused: 'bg-amber-100 text-amber-700'
}

function useItems(tasks?: Task[], events?: PersonalEvent[]): CalendarItem[] {
  return useMemo(() => {
    const taskItems: CalendarItem[] = (tasks || []).map((t) => ({
      id: t.id,
      title: t.name,
      date: t.due_date || t.start_date || t.created_at,
      type: 'task' as const,
      color: TASK_COLOR_MAP[t.status] || TASK_COLOR_MAP.todo,
      status: t.status
    }))

    const eventItems: CalendarItem[] = (events || []).map((e) => ({
      id: e.id,
      title: e.title,
      date: e.event_date ? `${e.event_date}T${e.start_time || '00:00'}:00` : e.created_at,
      type: 'event' as const,
      color: EVENT_COLOR_MAP[e.color || 'emerald'] || EVENT_COLOR_MAP.emerald
    }))

    return [...taskItems, ...eventItems]
  }, [tasks, events])
}

// ============ 周历 ============
export function WeekView({
  cursorDate,
  tasks,
  events,
  onTaskClick,
  onEventClick
}: {
  cursorDate: Date
  tasks?: Task[]
  events?: PersonalEvent[]
  onTaskClick?: (id: string) => void
  onEventClick?: (id: string) => void
}) {
  const items = useItems(tasks, events)
  const today = new Date()

  const weekDays = useMemo(() => {
    const start = new Date(cursorDate)
    start.setDate(start.getDate() - start.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [cursorDate])

  return (
    <div className="grid grid-cols-7 gap-1">
      {WEEKDAYS.map((w) => (
        <div key={w} className="text-center text-[10px] font-semibold text-muted-foreground pb-1">
          {w}
        </div>
      ))}
      {weekDays.map((d, i) => {
        const dayItems = items.filter((it) => isSameDay(it.date, d))
        const isToday = isSameDay(d, today)
        return (
          <div
            key={i}
            className={cn(
              'min-h-[120px] p-1.5 rounded-md border',
              isToday ? 'border-primary bg-primary/5' : 'border-border'
            )}
          >
            <div className={cn(
              'text-[10px] font-medium mb-1 inline-block w-5 h-5 leading-5 text-center rounded-full',
              isToday ? 'bg-primary text-white' : 'text-muted-foreground'
            )}>
              {d.getDate()}
            </div>
            <div className="space-y-0.5">
              {dayItems.slice(0, 4).map((it) => (
                <div
                  key={`${it.type}-${it.id}`}
                  onClick={() => it.type === 'task' ? onTaskClick?.(it.id) : onEventClick?.(it.id)}
                  className={cn(
                    'text-[10px] px-1 py-0.5 rounded cursor-pointer truncate',
                    it.color
                  )}
                >
                  {it.title}
                </div>
              ))}
              {dayItems.length > 4 && (
                <div className="text-[9px] text-muted-foreground">+{dayItems.length - 4} 项</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============ 月历 ============
export function MonthView({
  cursorDate,
  tasks,
  events,
  onTaskClick,
  onEventClick
}: {
  cursorDate: Date
  tasks?: Task[]
  events?: PersonalEvent[]
  onTaskClick?: (id: string) => void
  onEventClick?: (id: string) => void
}) {
  const items = useItems(tasks, events)
  const today = new Date()

  const days = useMemo(() => {
    const year = cursorDate.getFullYear()
    const month = cursorDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startOffset = firstDay.getDay()
    const startDate = new Date(year, month, 1 - startOffset)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      return d
    })
  }, [cursorDate])

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-r border-border">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1.5 text-center text-[10px] font-semibold text-muted-foreground border-l border-t border-border">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-b border-r border-border">
        {days.map((d, i) => {
          const inMonth = isSameMonth(d, cursorDate)
          const isToday = isSameDay(d, today)
          const dayItems = items.filter((it) => isSameDay(it.date, d))
          return (
            <div
              key={i}
              className={cn(
                'min-h-[80px] p-1 border-l border-t border-border',
                !inMonth && 'bg-muted/30'
              )}
            >
              <div className={cn(
                'text-[10px] font-medium mb-0.5 inline-block w-4 h-4 leading-4 text-center rounded-full',
                isToday ? 'bg-primary text-white' : !inMonth ? 'text-muted-foreground/60' : 'text-foreground'
              )}>
                {d.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayItems.slice(0, 2).map((it) => (
                  <div
                    key={`${it.type}-${it.id}`}
                    onClick={() => it.type === 'task' ? onTaskClick?.(it.id) : onEventClick?.(it.id)}
                    className={cn(
                      'text-[9px] px-1 py-0.5 rounded cursor-pointer truncate',
                      it.color
                    )}
                  >
                    {it.title}
                  </div>
                ))}
                {dayItems.length > 2 && (
                  <div className="text-[9px] text-muted-foreground">+{dayItems.length - 2}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============ 年历 ============
export function YearView({
  cursorDate,
  tasks,
  events,
  onMonthClick
}: {
  cursorDate: Date
  tasks?: Task[]
  events?: PersonalEvent[]
  onMonthClick?: (month: number) => void
}) {
  const items = useItems(tasks, events)
  const today = new Date()
  const year = cursorDate.getFullYear()

  const months = Array.from({ length: 12 }, (_, i) => i)

  return (
    <div className="grid grid-cols-4 gap-3">
      {months.map((m) => {
        const monthItems = items.filter((it) => {
          const d = new Date(it.date)
          return d.getFullYear() === year && d.getMonth() === m
        })
        const isCurrentMonth = today.getMonth() === m && today.getFullYear() === year

        // 当月小日历
        const firstDay = new Date(year, m, 1)
        const startOffset = firstDay.getDay()
        const startDate = new Date(year, m, 1 - startOffset)
        const monthDays = Array.from({ length: 42 }, (_, i) => {
          const d = new Date(startDate)
          d.setDate(startDate.getDate() + i)
          return d
        })

        return (
          <div
            key={m}
            onClick={() => onMonthClick?.(m)}
            className={cn(
              'border rounded-lg p-2 cursor-pointer hover:border-primary hover:shadow-sm transition-all',
              isCurrentMonth && 'border-primary bg-primary/5'
            )}
          >
            <div className="text-xs font-semibold mb-1.5 text-center">
              {m + 1}月
              <span className="ml-1 text-[9px] text-muted-foreground">({monthItems.length})</span>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-[8px] text-center text-muted-foreground mb-0.5">
              {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {monthDays.map((d, i) => {
                const inMonth = d.getMonth() === m
                const hasItems = monthItems.some((it) => isSameDay(it.date, d))
                const isToday = isSameDay(d, today)
                return (
                  <div
                    key={i}
                    className={cn(
                      'aspect-square flex items-center justify-center rounded text-[9px]',
                      !inMonth && 'opacity-30',
                      isToday ? 'bg-primary text-white font-bold' : hasItems ? 'bg-primary/20' : ''
                    )}
                  >
                    {d.getDate()}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}