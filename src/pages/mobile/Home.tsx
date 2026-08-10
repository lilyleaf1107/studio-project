import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { ROLE_LABELS, TASK_STATUS_LABELS, TASK_TYPE_LABELS, PRIORITY_LABELS } from '@/lib/settings'
import { useTasks } from '@/hooks/useTasks'
import { useWorkRecords, RECORD_ACTION_LABELS, RECORD_ACTION_COLORS } from '@/hooks/useWorkRecords'
import { useProfiles } from '@/hooks/useProfiles'
import { cn, formatDate, formatDateTime, isOverdue } from '@/lib/utils'
import Loading from '@/components/Loading'
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  History
} from 'lucide-react'

export default function Home() {
  const profile = useAuthStore((s) => s.profile)
  const userId = profile?.id
  const navigate = useNavigate()
  const { data: profiles } = useProfiles()
  const profileMap: Record<string, string> = {}
  profiles?.forEach((p) => (profileMap[p.id] = p.name))

  const filters = useMemo(() => userId ? { assignee_id: userId } : undefined, [userId])
  const { data: myTasks, isLoading: tasksLoading } = useTasks(filters)
  const { data: recentRecords } = useWorkRecords({ operator_id: userId, limit: 5 })

  const today = formatDate(new Date())

  const stats = useMemo(() => {
    const list = myTasks || []
    return [
      { label: '待办任务', value: list.filter((t) => t.status === 'todo' || t.status === 'paused').length, icon: CheckSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: '进行中', value: list.filter((t) => t.status === 'doing' || t.status === 'returned').length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
      { label: '今日完成', value: list.filter((t) => t.status === 'done' && formatDate(t.updated_at) === today).length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: '风险提醒', value: list.filter((t) => (t.status === 'returned' || t.status === 'delayed' || isOverdue(t.due_date)) && t.status !== 'done').length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' }
    ]
  }, [myTasks, today])

  // 我的重点任务（前5条）
  const keyTasks = useMemo(() => {
    const list = myTasks || []
    return list
      .filter((t) => ['todo', 'doing', 'returned', 'review'].includes(t.status))
      .sort((a, b) => {
        const order: any = { returned: 0, doing: 1, review: 2, todo: 3 }
        const sa = order[a.status] || 9
        const sb = order[b.status] || 9
        if (sa !== sb) return sa - sb
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      })
      .slice(0, 5)
  }, [myTasks])

  if (tasksLoading) return <Loading />

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">你好，{profile?.name || '用户'} 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {profile?.role ? ROLE_LABELS[profile.role] : ''} · 今天也要加油
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${s.bg} ${s.color} mb-2`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 我的待办 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium text-sm flex items-center gap-1.5">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              我的待办
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate('/tasks')}>
              全部 <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          {keyTasks.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              暂无待处理任务 🎉
            </div>
          ) : (
            <div className="space-y-2">
              {keyTasks.map((t) => {
                const statusMeta = TASK_STATUS_LABELS[t.status]
                const typeMeta = TASK_TYPE_LABELS[t.type]
                const priMeta = PRIORITY_LABELS[t.priority]
                const overdue = t.status !== 'done' && isOverdue(t.due_date)
                return (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/tasks/${t.id}`)}
                    className="w-full text-left p-3 rounded-lg border hover:border-primary hover:bg-muted/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm min-w-0 truncate flex-1">{t.name}</div>
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap shrink-0',
                        overdue ? 'bg-red-50 text-red-700' : statusMeta.color
                      )}>
                        {overdue ? '逾期' : statusMeta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded', typeMeta.color)}>
                        {typeMeta.label}
                      </span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded', priMeta.color)}>
                        {priMeta.label}
                      </span>
                      <span className={cn(
                        'text-[10px]',
                        overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'
                      )}>
                        截止 {formatDate(t.due_date)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 最近记录 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium text-sm flex items-center gap-1.5">
              <History className="h-4 w-4 text-muted-foreground" />
              我的最近动态
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate('/records')}>
              全部 <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          {!recentRecords || recentRecords.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              还没有操作记录
            </div>
          ) : (
            <div className="space-y-3">
              {recentRecords.map((r) => {
                const color = RECORD_ACTION_COLORS[r.action] || 'bg-slate-100 text-slate-700'
                return (
                  <div key={r.id} className="flex gap-3">
                    <div className={cn('mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium', color)}>
                      {RECORD_ACTION_LABELS[r.action] || r.action}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs line-clamp-2">{r.content}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDateTime(r.created_at)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
