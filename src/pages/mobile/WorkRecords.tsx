import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import Loading from '@/components/Loading'
import {
  useWorkRecords,
  RECORD_ACTION_LABELS,
  RECORD_ACTION_COLORS
} from '@/hooks/useWorkRecords'
import { useProfiles } from '@/hooks/useProfiles'
import { useTasks } from '@/hooks/useTasks'
import { cn, formatDateTime } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import type { RecordAction } from '@/types'
import { CheckSquare, ChevronRight } from 'lucide-react'

export default function WorkRecords() {
  const profile = useAuthStore((s) => s.profile)
  const userId = profile?.id
  const navigate = useNavigate()

  const { data: profiles } = useProfiles()
  const profileMap: Record<string, string> = {}
  profiles?.forEach((p) => (profileMap[p.id] = p.name))

  const { data: tasks } = useTasks()
  const taskMap: Record<string, string> = {}
  tasks?.forEach((t) => (taskMap[t.id] = t.name))

  const filters = useMemo(() => ({ operator_id: userId }), [userId])
  const { data: records, isLoading } = useWorkRecords(filters)

  if (isLoading) return <Loading />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">工作记录</h1>
      <p className="text-xs text-muted-foreground -mt-2">
        我的工作流水（{records?.length || 0}）
      </p>

      {!records || records.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            还没有工作记录
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {records.map((r) => {
            const color = RECORD_ACTION_COLORS[r.action] || 'bg-slate-100 text-slate-700'
            const taskName = taskMap[r.task_id || '']
            return (
              <Card
                key={r.id}
                className={taskName ? 'cursor-pointer hover:border-primary' : ''}
                onClick={() => taskName && navigate(`/tasks/${r.task_id}`)}
              >
                <CardContent className="p-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className={cn(
                      'mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium',
                      color
                    )}>
                      {RECORD_ACTION_LABELS[r.action as RecordAction] || r.action}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs line-clamp-3">{r.content}</div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(r.created_at)}
                        </span>
                        {taskName && (
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/tasks/${r.task_id}`) }}
                            className="inline-flex items-center gap-0.5 text-[10px] text-primary"
                          >
                            <CheckSquare className="h-3 w-3" /> {taskName}
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
