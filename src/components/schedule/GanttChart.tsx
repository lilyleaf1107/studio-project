import { useMemo } from 'react'
import { cn, formatDate } from '@/lib/utils'
import type { Task, PersonalEvent } from '@/types'

export interface GanttItem {
  id: string
  title: string
  startDate: string
  endDate?: string
  type: 'task' | 'event'
  status?: string
  color?: string
}

interface Props {
  tasks: Task[]
  events: PersonalEvent[]
  days?: number
  onTaskClick?: (id: string) => void
  onEventClick?: (id: string) => void
}

const EVENT_COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-400 text-emerald-900',
  sky: 'bg-sky-400 text-sky-900',
  amber: 'bg-amber-400 text-amber-900',
  rose: 'bg-rose-400 text-rose-900',
  violet: 'bg-violet-400 text-violet-900'
}

const TASK_COLOR_MAP: Record<string, string> = {
  todo: 'bg-slate-300 text-slate-800',
  doing: 'bg-blue-400 text-blue-900',
  review: 'bg-purple-400 text-purple-900',
  done: 'bg-emerald-400 text-emerald-900',
  delayed: 'bg-red-400 text-red-900',
  returned: 'bg-orange-400 text-orange-900',
  paused: 'bg-amber-300 text-amber-900'
}

export default function GanttChart({ tasks, events, days = 14, onTaskClick, onEventClick }: Props) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const dateList = useMemo(() => {
    const list: Date[] = []
    for (let i = 0; i < days; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      list.push(d)
    }
    return list
  }, [today, days])

  const items = useMemo<GanttItem[]>(() => {
    const taskItems: GanttItem[] = (tasks || [])
      .filter((t) => t.due_date || t.start_date)
      .map((t) => ({
        id: t.id,
        title: t.name,
        startDate: t.start_date || t.due_date || t.created_at,
        endDate: t.due_date || t.due_date,
        type: 'task' as const,
        status: t.status,
        color: TASK_COLOR_MAP[t.status] || 'bg-slate-300'
      }))

    const eventItems: GanttItem[] = (events || []).map((e) => ({
      id: e.id,
      title: e.title,
      startDate: e.event_date ? `${e.event_date}T${e.start_time || '00:00'}:00` : e.created_at,
      endDate: e.event_date
        ? `${e.event_date}T${e.end_time || e.start_time || '23:59'}:00`
        : e.created_at,
      type: 'event' as const,
      color: EVENT_COLOR_MAP[e.color || 'emerald'] || EVENT_COLOR_MAP.emerald
    }))

    return [...taskItems, ...eventItems]
  }, [tasks, events])

  const totalWidth = days * 40

  function getOffset(dateStr: string): number {
    const d = new Date(dateStr)
    const diff = Math.floor((d.getTime() - today.getTime()) / 86400000)
    return Math.max(0, Math.min(days, diff))
  }

  function getSpan(startStr: string, endStr?: string): number {
    const start = new Date(startStr)
    const end = endStr ? new Date(endStr) : start
    const diff = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
    return Math.max(1, Math.min(days, diff))
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <div style={{ minWidth: 220 + totalWidth }}>
          {/* 表头 */}
          <div className="flex border-b bg-muted/40">
            <div className="w-56 shrink-0 p-2 text-xs font-semibold text-muted-foreground border-r">
              任务/事件
            </div>
            <div className="flex">
              {dateList.map((d, i) => {
                const isToday = formatDate(d) === formatDate(today)
                const isWeekend = d.getDay() === 0 || d.getDay() === 6
                return (
                  <div
                    key={i}
                    className={cn(
                      'w-10 shrink-0 p-1 text-center text-[10px] border-r',
                      isToday && 'bg-primary/10 font-semibold text-primary',
                      isWeekend && 'bg-muted/30',
                      !isToday && !isWeekend && 'text-muted-foreground'
                    )}
                  >
                    <div>{d.getMonth() + 1}/{d.getDate()}</div>
                    <div className="text-[9px] opacity-70">
                      {['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 行 */}
          <div>
            {items.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                未来 {days} 天没有任务或事件
              </div>
            )}
            {items.map((item) => {
              const offset = getOffset(item.startDate)
              const span = getSpan(item.startDate, item.endDate)
              if (offset >= days) return null
              const visibleSpan = Math.min(span, days - offset)
              return (
                <div key={`${item.type}-${item.id}`} className="flex border-b hover:bg-muted/20">
                  <div className="w-56 shrink-0 p-2 text-xs truncate border-r">
                    <span className={cn(
                      'inline-block h-1.5 w-1.5 rounded-full mr-1.5',
                      item.type === 'task' ? 'bg-blue-400' : 'bg-emerald-400'
                    )} />
                    <button
                      className="hover:text-primary text-left"
                      onClick={() => item.type === 'task' ? onTaskClick?.(item.id) : onEventClick?.(item.id)}
                    >
                      {item.title}
                    </button>
                  </div>
                  <div className="flex relative" style={{ width: totalWidth }}>
                    <div
                      className={cn(
                        'absolute h-6 rounded-md flex items-center px-2 text-[10px] font-medium truncate',
                        item.color
                      )}
                      style={{
                        left: offset * 40 + 2,
                        width: visibleSpan * 40 - 4
                      }}
                    >
                      {item.title}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}