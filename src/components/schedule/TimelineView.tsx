import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { Task, PersonalEvent } from '@/types'

interface Props {
  date: Date
  tasks: Task[]
  events: PersonalEvent[]
  onTaskClick?: (id: string) => void
  onEventClick?: (id: string) => void
}

interface TimeBlock {
  id: string
  type: 'task' | 'event'
  title: string
  time?: string
  endTime?: string
  color?: string
  status?: string
}

const EVENT_COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-50 border-emerald-400 text-emerald-800',
  sky: 'bg-sky-50 border-sky-400 text-sky-800',
  amber: 'bg-amber-50 border-amber-400 text-amber-800',
  rose: 'bg-rose-50 border-rose-400 text-rose-800',
  violet: 'bg-violet-50 border-violet-400 text-violet-800'
}

const TASK_COLOR_MAP: Record<string, string> = {
  todo: 'bg-slate-50 border-slate-400 text-slate-700',
  doing: 'bg-blue-50 border-blue-400 text-blue-800',
  review: 'bg-purple-50 border-purple-400 text-purple-800',
  done: 'bg-emerald-50 border-emerald-400 text-emerald-800',
  delayed: 'bg-red-50 border-red-400 text-red-800',
  returned: 'bg-orange-50 border-orange-400 text-orange-800',
  paused: 'bg-amber-50 border-amber-400 text-amber-800'
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function TimelineView({ date, tasks, events, onTaskClick, onEventClick }: Props) {
  const dayStr = useMemo(() => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [date])

  const blocks = useMemo<TimeBlock[]>(() => {
    const taskBlocks: TimeBlock[] = (tasks || [])
      .filter((t) => {
        const dueDate = t.due_date ? new Date(t.due_date) : null
        return dueDate && dueDate.toISOString().slice(0, 10) === dayStr
      })
      .map((t) => ({
        id: t.id,
        type: 'task' as const,
        title: t.name,
        time: t.due_date ? new Date(t.due_date).toTimeString().slice(0, 5) : undefined,
        color: TASK_COLOR_MAP[t.status] || TASK_COLOR_MAP.todo,
        status: t.status
      }))

    const eventBlocks: TimeBlock[] = (events || [])
      .filter((e) => e.event_date === dayStr)
      .map((e) => ({
        id: e.id,
        type: 'event' as const,
        title: e.title,
        time: e.start_time,
        endTime: e.end_time,
        color: EVENT_COLOR_MAP[e.color || 'emerald'] || EVENT_COLOR_MAP.emerald
      }))

    const allBlocks = [...taskBlocks, ...eventBlocks]
    allBlocks.sort((a, b) => {
      const ta = a.time ? parseInt(a.time.split(':')[0]) : 99
      const tb = b.time ? parseInt(b.time.split(':')[0]) : 99
      return ta - tb
    })
    return allBlocks
  }, [tasks, events, dayStr])

  const now = new Date()
  const isToday = dayStr === now.toISOString().slice(0, 10)
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  return (
    <div className="flex h-[600px] overflow-y-auto">
      {/* 时间轴 */}
      <div className="w-16 shrink-0 border-r">
        {HOURS.map((h) => (
          <div key={h} className="h-12 border-b text-[10px] text-muted-foreground text-right pr-2 pt-1">
            {String(h).padStart(2, '0')}:00
          </div>
        ))}
      </div>

      {/* 事件区域 */}
      <div className="flex-1 relative">
        {HOURS.map((h) => (
          <div key={h} className="h-12 border-b" />
        ))}

        {/* 当前时间指示线 */}
        {isToday && (
          <div
            className="absolute left-0 right-0 h-0.5 bg-red-500 z-10"
            style={{ top: `${(currentHour + currentMinute / 60) * 48}px` }}
          >
            <span className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full" />
          </div>
        )}

        {/* 事件块 */}
        {blocks.map((b) => {
          let topOffset = 0
          let height = 48
          if (b.time) {
            const [h, m] = b.time.split(':').map(Number)
            topOffset = (h + m / 60) * 48
            if (b.endTime) {
              const [eh, em] = b.endTime.split(':').map(Number)
              const endOffset = (eh + em / 60) * 48
              height = Math.max(20, endOffset - topOffset)
            }
          }
          return (
            <div
              key={`${b.type}-${b.id}`}
              onClick={() => b.type === 'task' ? onTaskClick?.(b.id) : onEventClick?.(b.id)}
              className={cn(
                'absolute left-2 right-2 border-l-2 rounded-r-md px-2 py-1 cursor-pointer hover:shadow-md transition-shadow',
                b.color
              )}
              style={{
                top: `${topOffset}px`,
                height: `${height}px`,
                minHeight: '24px'
              }}
            >
              <div className="text-[10px] font-medium truncate">{b.title}</div>
              {b.time && (
                <div className="text-[9px] opacity-75 truncate">
                  {b.time}{b.endTime ? ` - ${b.endTime}` : ''}
                </div>
              )}
            </div>
          )
        })}

        {blocks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            当天没有任务或事件
          </div>
        )}
      </div>
    </div>
  )
}