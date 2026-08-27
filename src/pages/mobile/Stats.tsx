import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import Loading from '@/components/Loading'
import { useTasks } from '@/hooks/useTasks'
import { useBigProjects } from '@/hooks/useProjects'
import { useProfiles } from '@/hooks/useProfiles'
import {
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS
} from '@/lib/settings'
import { canViewAllProjects } from '@/lib/permissions'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import {
  CheckSquare,
  TrendingUp,
  AlertTriangle,
  FolderKanban
} from 'lucide-react'

type Counter = Record<string, number>

function count<T extends object>(arr: T[] | undefined, getKey: (t: T) => string | undefined): Counter {
  const m: Counter = {}
  ;(arr || []).forEach((t) => {
    const k = getKey(t)
    if (!k) return
    m[k] = (m[k] || 0) + 1
  })
  return m
}

function percent(value: number, total: number) {
  if (total <= 0) return 0
  return Math.round((value / total) * 100)
}

function MiniBar({
  labels,
  values,
  colors
}: {
  labels: string[]
  values: number[]
  colors: string[]
}) {
  const total = values.reduce((s, v) => s + v, 0)
  if (total === 0) {
    return <div className="text-xs text-muted-foreground py-3 text-center">暂无数据</div>
  }
  return (
    <div className="space-y-2">
      {labels.map((label, i) => {
        const v = values[i] || 0
        const p = percent(v, total)
        const color = colors[i] || 'bg-slate-200'
        const textColor = color.replace('bg-', 'text-').split(' ')[0]
        return (
          <div key={label}>
            <div className="flex items-center justify-between mb-0.5 text-[11px]">
              <span className="text-muted-foreground">{label}</span>
              <span className={cn('font-medium', textColor)}>
                {v} <span className="text-muted-foreground font-normal">({p}%)</span>
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full', color)} style={{ width: `${p}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Stats() {
  const profile = useAuthStore((s) => s.profile)
  const canAll = canViewAllProjects(profile?.role)
  const userId = profile?.id

  const taskFilters = useMemo(() => (canAll ? undefined : { assignee_id: userId }), [canAll, userId])

  const { data: tasks, isLoading: tLoading } = useTasks(taskFilters)
  const { data: bigProjects, isLoading: bpLoading } = useBigProjects()
  const { data: profiles } = useProfiles()

  const loading = tLoading || bpLoading
  const today = formatDate(new Date())

  const statusCount = useMemo(() => count(tasks, (t) => t.status), [tasks])
  const typeCount = useMemo(() => count(tasks, (t) => t.type), [tasks])
  const priorityCount = useMemo(() => count(tasks, (t) => t.priority), [tasks])
  const totalTasks = tasks?.length || 0

  const doneCount = statusCount['done'] || 0
  const completionRate = percent(doneCount, totalTasks)

  const overdueCount = useMemo(
    () => (tasks || []).filter((t) => t.status !== 'done' && isOverdue(t.due_date)).length,
    [tasks]
  )

  const staffLoad = useMemo(() => {
    if (!canAll) return [] as { id: string; name: string; total: number; done: number; doing: number; overdue: number }[]
    const arr = tasks || []
    const map: Record<string, any> = {}
    profiles?.forEach((p) => {
      if (p.role === 'staff' || p.role === 'admin' || p.role === 'owner') {
        map[p.id] = { id: p.id, name: p.name, total: 0, done: 0, doing: 0, overdue: 0 }
      }
    })
    arr.forEach((t) => {
      const id = t.assignee_id
      if (!map[id]) return
      map[id].total += 1
      if (t.status === 'done') map[id].done += 1
      if (t.status === 'doing') map[id].doing += 1
      if (t.status !== 'done' && isOverdue(t.due_date)) map[id].overdue += 1
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [canAll, tasks, profiles])

  const bpStatusCount = useMemo(() => count(bigProjects, (p) => p.status), [bigProjects])
  const totalBP = bigProjects?.length || 0
  const doneBP = bpStatusCount['completed'] || 0
  const bpCompletion = percent(doneBP, totalBP)

  if (loading) return <Loading />

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">数据统计</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {canAll ? '全局项目与任务分布' : '我的任务完成情况'}
        </p>
      </div>

      {/* 总体指标 */}
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <CheckSquare className="h-3.5 w-3.5" />总任务
            </div>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <div className="mt-1.5">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                <span>完成率</span>
                <span className="font-medium text-emerald-600">{completionRate}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${completionRate}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5" />已完成
            </div>
            <div className="text-2xl font-bold text-emerald-600">{doneCount}</div>
            <div className="text-[10px] text-muted-foreground mt-1">占比 {completionRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <AlertTriangle className="h-3.5 w-3.5" />已逾期
            </div>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
            <div className="text-[10px] text-muted-foreground mt-1">需优先处理</div>
          </CardContent>
        </Card>
        {canAll ? (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <FolderKanban className="h-3.5 w-3.5" />项目完成率
              </div>
              <div className="text-2xl font-bold text-primary">{bpCompletion}%</div>
              <div className="text-[10px] text-muted-foreground mt-1">{doneBP}/{totalBP} 个已完成</div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <CheckSquare className="h-3.5 w-3.5" />今日完成
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {(tasks || []).filter((t) => t.status === 'done' && formatDate(t.updated_at) === today).length}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">每日进步</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 任务状态分布 */}
      <Card>
        <CardContent className="p-3">
          <div className="font-medium text-sm mb-2">任务状态分布</div>
          <MiniBar
            labels={Object.entries(TASK_STATUS_LABELS).map(([_, v]) => v.label)}
            values={Object.keys(TASK_STATUS_LABELS).map((k) => statusCount[k] || 0)}
            colors={Object.entries(TASK_STATUS_LABELS).map(([_, v]) => v.color.split(' ')[0])}
          />
        </CardContent>
      </Card>

      {/* 任务类型分布 */}
      <Card>
        <CardContent className="p-3">
          <div className="font-medium text-sm mb-2">任务类型分布</div>
          <MiniBar
            labels={Object.entries(TASK_TYPE_LABELS).map(([_, v]) => v.label)}
            values={Object.keys(TASK_TYPE_LABELS).map((k) => typeCount[k] || 0)}
            colors={Object.entries(TASK_TYPE_LABELS).map(([_, v]) => v.color.split(' ')[0])}
          />
        </CardContent>
      </Card>

      {/* 优先级 */}
      <Card>
        <CardContent className="p-3">
          <div className="font-medium text-sm mb-2">优先级分布</div>
          <MiniBar
            labels={Object.entries(PRIORITY_LABELS).map(([_, v]) => v.label)}
            values={Object.keys(PRIORITY_LABELS).map((k) => priorityCount[k] || 0)}
            colors={Object.entries(PRIORITY_LABELS).map(([_, v]) => v.color.split(' ')[0])}
          />
        </CardContent>
      </Card>

      {/* 员工工作量 */}
      {canAll && (
        <Card>
          <CardContent className="p-3">
            <div className="font-medium text-sm mb-2">员工工作量</div>
            {staffLoad.length === 0 ? (
              <div className="text-xs text-muted-foreground py-3 text-center">暂无员工数据</div>
            ) : (
              <div className="space-y-2.5">
                {staffLoad.slice(0, 8).map((s, idx) => {
                  const doneP = percent(s.done, s.total)
                  return (
                    <div key={s.id}>
                      <div className="flex items-center justify-between mb-0.5 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground w-3">{idx + 1}.</span>
                          <div className="h-4 w-4 rounded-full bg-secondary flex items-center justify-center text-[9px] font-semibold">
                            {s.name.slice(0, 1)}
                          </div>
                          <span className="font-medium">{s.name}</span>
                          {s.overdue > 0 && (
                            <span className="px-1 rounded bg-red-50 text-red-700 text-[9px]">逾期 {s.overdue}</span>
                          )}
                        </div>
                        <span className="text-muted-foreground">{s.done}/{s.total}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-500" style={{ width: `${doneP}%` }} />
                        <div className="h-full bg-amber-400" style={{ width: `${percent(s.doing, s.total)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 项目状态 */}
      {canAll && (
        <Card>
          <CardContent className="p-3">
            <div className="font-medium text-sm mb-2">项目状态（{totalBP} 个）</div>
            <MiniBar
              labels={Object.entries(PROJECT_STATUS_LABELS).map(([_, v]) => v.label)}
              values={Object.keys(PROJECT_STATUS_LABELS).map((k) => bpStatusCount[k] || 0)}
              colors={Object.entries(PROJECT_STATUS_LABELS).map(([_, v]) => v.color.split(' ')[0])}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
