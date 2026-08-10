import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Loading from '@/components/Loading'
import { useTasks } from '@/hooks/useTasks'
import { useBigProjects } from '@/hooks/useProjects'
import { useSubProjects } from '@/hooks/useSubProjects'
import { useProfiles } from '@/hooks/useProfiles'
import {
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  ROLE_LABELS
} from '@/lib/settings'
import { canViewAllProjects } from '@/lib/permissions'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import {
  FolderKanban,
  CheckSquare,
  BarChart3,
  Users,
  TrendingUp,
  AlertTriangle,
  PieChart
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

function Bar({
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
    return <div className="text-sm text-muted-foreground py-6 text-center">暂无数据</div>
  }
  return (
    <div className="space-y-3">
      {labels.map((label, i) => {
        const v = values[i] || 0
        const p = percent(v, total)
        const color = colors[i] || 'bg-slate-200'
        const textColor = color.replace('bg-', 'text-').split(' ')[0]
        return (
          <div key={label}>
            <div className="flex items-center justify-between mb-1 text-xs">
              <span className="text-muted-foreground">{label}</span>
              <span className={cn('font-medium', textColor)}>
                {v} <span className="text-muted-foreground font-normal">({p}%)</span>
              </span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${p}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Donut({
  slices,
  size = 160
}: {
  slices: { label: string; value: number; color: string }[]
  size?: number
}) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  const r = size / 2 - 18
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <div className="shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-muted" strokeWidth={16} />
          {total > 0 && slices.map((s, i) => {
            const len = (s.value / total) * c
            const dash = `${len} ${c - len}`
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={16}
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className={s.color.replace('bg-', 'stroke-')}
              />
            )
            offset += len
            return el
          })}
          <text
            x="50%"
            y="45%"
            textAnchor="middle"
            className="fill-foreground"
            style={{ fontSize: size / 7, fontWeight: 700 }}
          >
            {total}
          </text>
          <text
            x="50%"
            y="58%"
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: size / 10 }}
          >
            总计
          </text>
        </svg>
      </div>
      <div className="flex-1 min-w-[180px] space-y-2">
        {slices.filter((s) => s.value > 0).map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className={cn('h-2.5 w-2.5 rounded-full', s.color)} />
            <span className="text-muted-foreground flex-1">{s.label}</span>
            <span className="font-medium">{s.value}</span>
            <span className="text-muted-foreground">{percent(s.value, total)}%</span>
          </div>
        ))}
      </div>
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
  const { data: subProjects } = useSubProjects()
  const { data: profiles } = useProfiles()

  const loading = tLoading || bpLoading
  const today = formatDate(new Date())

  // ---------- 任务统计 ----------
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

  // ---------- 员工工作量排名 ----------
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

  // ---------- 项目统计 ----------
  const bpStatusCount = useMemo(() => count(bigProjects, (p) => p.status), [bigProjects])
  const totalBP = bigProjects?.length || 0
  const doneBP = bpStatusCount['completed'] || 0
  const bpCompletion = percent(doneBP, totalBP)

  if (loading) return <Loading />

  const statusSlices = Object.entries(TASK_STATUS_LABELS).map(([k, v]) => ({
    label: v.label,
    value: statusCount[k] || 0,
    color: v.color.split(' ')[0]
  }))

  const typeSlices = Object.entries(TASK_TYPE_LABELS).map(([k, v]) => ({
    label: v.label,
    value: typeCount[k] || 0,
    color: v.color.split(' ')[0]
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-indigo-600" /> 数据统计
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {canAll ? '全局项目进度、任务分布与员工工作量' : '我的任务完成情况'}
        </p>
      </div>

      {/* 总体指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <CheckSquare className="h-4 w-4" /> 总任务数
            </div>
            <div className="text-3xl font-bold">{totalTasks}</div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>完成率</span>
                <span className="font-medium text-emerald-600">{completionRate}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${completionRate}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4" /> 已完成任务
            </div>
            <div className="text-3xl font-bold text-emerald-600">{doneCount}</div>
            <div className="text-xs text-muted-foreground mt-2">
              占比 {completionRate}% · 持续加油
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <AlertTriangle className="h-4 w-4" /> 已逾期
            </div>
            <div className="text-3xl font-bold text-red-600">{overdueCount}</div>
            <div className="text-xs text-muted-foreground mt-2">
              需要优先处理的任务
            </div>
          </CardContent>
        </Card>
        {canAll ? (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <FolderKanban className="h-4 w-4" /> 大项目完成率
              </div>
              <div className="text-3xl font-bold text-indigo-600">{bpCompletion}%</div>
              <div className="text-xs text-muted-foreground mt-2">
                {doneBP}/{totalBP} 个项目已完成
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <CheckSquare className="h-4 w-4" /> 今日完成
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {(tasks || []).filter((t) => t.status === 'done' && formatDate(t.updated_at) === today).length}
              </div>
              <div className="text-xs text-muted-foreground mt-2">保持每日进步 🚀</div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 任务状态分布 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4 text-muted-foreground" /> 任务状态分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Donut slices={statusSlices} />
          </CardContent>
        </Card>

        {/* 任务类型分布 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4 text-muted-foreground" /> 任务类型分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Donut slices={typeSlices} />
          </CardContent>
        </Card>

        {/* 优先级条形 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">优先级分布</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar
              labels={Object.entries(PRIORITY_LABELS).map(([_, v]) => v.label)}
              values={Object.keys(PRIORITY_LABELS).map((k) => priorityCount[k] || 0)}
              colors={Object.entries(PRIORITY_LABELS).map(([_, v]) => v.color.split(' ')[0])}
            />
          </CardContent>
        </Card>

        {/* 员工工作量 */}
        {canAll && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" /> 员工工作量
              </CardTitle>
            </CardHeader>
            <CardContent>
              {staffLoad.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">暂无员工数据</div>
              ) : (
                <div className="space-y-3">
                  {staffLoad.slice(0, 8).map((s, idx) => {
                    const doneP = percent(s.done, s.total)
                    return (
                      <div key={s.id}>
                        <div className="flex items-center justify-between mb-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-4 text-muted-foreground">{idx + 1}.</span>
                            <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold">
                              {s.name.slice(0, 1)}
                            </div>
                            <span className="font-medium">{s.name}</span>
                            {s.overdue > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px]">
                                逾期 {s.overdue}
                              </span>
                            )}
                          </div>
                          <span className="text-muted-foreground">
                            {s.done}/{s.total} 完成
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${doneP}%` }}
                            title={`完成 ${doneP}%`}
                          />
                          <div
                            className="h-full bg-amber-400"
                            style={{ width: `${percent(s.doing, s.total)}%` }}
                            title={`进行中 ${percent(s.doing, s.total)}%`}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 项目状态统计 */}
        {canAll && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">大项目状态（{totalBP} 个）</CardTitle>
            </CardHeader>
            <CardContent>
              <Bar
                labels={Object.entries(PROJECT_STATUS_LABELS).map(([_, v]) => v.label)}
                values={Object.keys(PROJECT_STATUS_LABELS).map((k) => bpStatusCount[k] || 0)}
                colors={Object.entries(PROJECT_STATUS_LABELS).map(([_, v]) => v.color.split(' ')[0])}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
