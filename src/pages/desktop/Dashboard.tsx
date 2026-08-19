import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { canViewAllProjects, canAdjustPriority } from '@/lib/permissions'
import {
  useWorkRecords,
  RECORD_ACTION_LABELS,
  RECORD_ACTION_COLORS
} from '@/hooks/useWorkRecords'
import { useProfiles } from '@/hooks/useProfiles'
import { useTasks, useUpdateTaskPriority, useUpdateTaskStatus } from '@/hooks/useTasks'
import { useBigProjects } from '@/hooks/useProjects'
import {
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_FLAGS
} from '@/lib/settings'
import { cn, formatDate, formatDateTime, isOverdue, getCountdown } from '@/lib/utils'
import Loading from '@/components/Loading'
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FolderKanban,
  FolderGit2,
  Eye,
  History
} from 'lucide-react'
import type { TaskPriority } from '@/types'

const PRIORITY_CYCLE: TaskPriority[] = ['low', 'medium', 'high']

// 项目倒计时文案与颜色：>7天灰色、4-7天黄色、1-3天橙色、当天红色、逾期红色加粗
function getProjectCountdown(endDate?: string): { text: string; className: string } {
  if (!endDate) return { text: '', className: '' }
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  const diffDays = Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) {
    return { text: `已逾期 ${Math.abs(diffDays)} 天`, className: 'text-red-600 font-bold' }
  }
  if (diffDays === 0) {
    return { text: '今天截止', className: 'text-red-600' }
  }
  if (diffDays <= 3) {
    return { text: `剩余 ${diffDays} 天`, className: 'text-orange-600' }
  }
  if (diffDays <= 7) {
    return { text: `剩余 ${diffDays} 天`, className: 'text-yellow-600' }
  }
  return { text: `剩余 ${diffDays} 天`, className: 'text-muted-foreground' }
}

export default function Dashboard() {
  const profile = useAuthStore((s) => s.profile)
  const canAll = canViewAllProjects(profile?.role)
  const canEditPriority = canAdjustPriority(profile?.role)
  const userId = profile?.id
  const navigate = useNavigate()
  const updatePriority = useUpdateTaskPriority()
  const updateStatus = useUpdateTaskStatus()

  function cyclePriority(id: string, current: TaskPriority, e: React.MouseEvent) {
    e.stopPropagation()
    const idx = PRIORITY_CYCLE.indexOf(current)
    const next = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length]
    updatePriority.mutate({ id, priority: next })
  }

  const { data: profiles } = useProfiles()
  const profileMap: Record<string, string> = {}
  profiles?.forEach((p) => (profileMap[p.id] = p.name))

  // 全局统计查询（老板/管理员）
  const { data: globalStats, isLoading: gsLoading } = useQuery({
    queryKey: ['dashboard-global-stats'],
    queryFn: async () => {
      if (!canAll) return null
      const [bpRes, spRes, reviewRes, delayedRes] = await Promise.all([
        supabase.from('big_projects').select('id', { count: 'exact', head: true }).in('status', ['active', 'paused', 'reviewing']),
        supabase.from('sub_projects').select('id', { count: 'exact', head: true }).in('status', ['active', 'paused', 'reviewing']),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'review'),
        supabase.from('tasks').select('id, due_date, status').then(({ data }) => {
          const today = new Date()
          today.setHours(23, 59, 59, 999)
          return (data || []).filter((t) =>
            t.status !== 'done' && t.due_date && new Date(t.due_date) < today
          ).length
        })
      ])
      return {
        bigProjects: bpRes.count || 0,
        subProjects: spRes.count || 0,
        reviewTasks: reviewRes.count || 0,
        delayedTasks: delayedRes as unknown as number
      }
    },
    enabled: canAll
  })

  // 个人任务查询（员工）
  const mineFilters = useMemo(() => userId ? { assignee_id: userId } : undefined, [userId])
  const { data: myTasks, isLoading: mineLoading } = useTasks(mineFilters)

  const today = formatDate(new Date())
  const myStats = useMemo(() => {
    const list = myTasks || []
    return {
      todo: list.filter((t) => t.status === 'todo' || t.status === 'paused').length,
      doing: list.filter((t) => t.status === 'doing' || t.status === 'returned').length,
      review: list.filter((t) => t.status === 'review').length,
      todayDone: list.filter((t) => t.status === 'done' && formatDate(t.updated_at) === today).length,
      risk: list.filter((t) =>
        (t.status === 'returned' || t.status === 'delayed' || isOverdue(t.due_date)) && t.status !== 'done'
      ).length
    }
  }, [myTasks, today])

  // 我的关键任务（前5条待办/进行中）
  const myKeyTasks = useMemo(() => {
    const list = myTasks || []
    return list
      .filter((t) => ['todo', 'doing', 'returned', 'review'].includes(t.status))
      .sort((a, b) => {
        const order = { returned: 0, doing: 1, review: 2, todo: 3 } as any
        const sa = order[a.status] || 9
        const sb = order[b.status] || 9
        if (sa !== sb) return sa - sb
        const av = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
        const bv = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
        return av - bv
      })
      .slice(0, 5)
  }, [myTasks])

  // 最近工作动态（老板看全部，员工看自己的）
  const recordFilters = useMemo(() => ({
    ...(canAll ? {} : { operator_id: userId }),
    limit: 10
  }), [canAll, userId])
  const { data: recentRecords } = useWorkRecords(recordFilters)

  // 进行中的大项目（老板视图）
  const { data: activeBPs } = useBigProjects()
  const activeBPLimited = useMemo(() => {
    const list = activeBPs || []
    return list
      .filter((p) => ['active', 'paused', 'reviewing'].includes(p.status))
      .slice(0, 5)
  }, [activeBPs])

  // 项目倒计时：未完成/未归档，按截止日升序，最多 5 条
  const countdownProjects = useMemo(() => {
    const list = activeBPs || []
    return list
      .filter((p) => !['completed', 'archived'].includes(p.status))
      .sort((a, b) => {
        const av = a.end_date ? new Date(a.end_date).getTime() : Number.MAX_SAFE_INTEGER
        const bv = b.end_date ? new Date(b.end_date).getTime() : Number.MAX_SAFE_INTEGER
        return av - bv
      })
      .slice(0, 5)
  }, [activeBPs])

  // 待办事项：todo/doing/returned，最多 8 条
  const todoTasks = useMemo(() => {
    const list = myTasks || []
    return list
      .filter((t) => ['todo', 'doing', 'returned'].includes(t.status))
      .slice(0, 8)
  }, [myTasks])

  const loading = canAll ? gsLoading : mineLoading

  const cards = canAll
    ? [
        { label: '进行中大项目', value: globalStats?.bigProjects || 0, color: 'text-blue-600', icon: FolderKanban, bg: 'bg-blue-50' },
        { label: '进行中小项目', value: globalStats?.subProjects || 0, color: 'text-indigo-600', icon: FolderGit2, bg: 'bg-indigo-50' },
        { label: '待验收任务', value: globalStats?.reviewTasks || 0, color: 'text-purple-600', icon: Eye, bg: 'bg-purple-50' },
        { label: '风险/延期提醒', value: globalStats?.delayedTasks || 0, color: 'text-red-600', icon: AlertTriangle, bg: 'bg-red-50' }
      ]
    : [
        { label: '待办任务', value: myStats.todo, color: 'text-slate-600', icon: CheckSquare, bg: 'bg-slate-50' },
        { label: '进行中', value: myStats.doing, color: 'text-blue-600', icon: Clock, bg: 'bg-blue-50' },
        { label: '今日已完成', value: myStats.todayDone, color: 'text-emerald-600', icon: CheckCircle2, bg: 'bg-emerald-50' },
        { label: '被退回/延期', value: myStats.risk, color: 'text-red-600', icon: AlertTriangle, bg: 'bg-red-50' }
      ]

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">首页</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {canAll ? '查看全局项目进度和风险提醒' : '查看您今天要处理的事项'}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-5">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${c.bg} ${c.color} mb-3`}>
                <c.icon className="h-5 w-5" />
              </div>
              <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 项目倒计时 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">项目倒计时</CardTitle>
          </CardHeader>
          <CardContent>
            {countdownProjects.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                暂无项目
              </div>
            ) : (
              <div className="space-y-2">
                {countdownProjects.map((p) => {
                  const cd = getProjectCountdown(p.end_date)
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/projects/${p.id}`)}
                      className="w-full text-left p-3 rounded-lg border hover:border-primary hover:bg-muted/30 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-sm min-w-0 truncate flex-1">{p.name}</div>
                        {cd.text && (
                          <span className={cn('text-xs whitespace-nowrap shrink-0', cd.className)}>
                            {cd.text}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 待办事项 */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">待办事项</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={() => navigate('/today')}
            >
              查看全部 <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {todoTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                暂无待办 🎉
              </div>
            ) : (
              <div className="space-y-2">
                {todoTasks.map((t) => {
                  const statusMeta = TASK_STATUS_LABELS[t.status]
                  const countdown = getCountdown(t.due_date, t.start_date)
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/30 transition-all"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
                        checked={t.status === 'done'}
                        onChange={() => updateStatus.mutate({ id: t.id, status: 'done' })}
                        disabled={updateStatus.isPending}
                      />
                      <button
                        onClick={() => navigate(`/tasks/${t.id}`)}
                        className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
                      >
                        <span className="shrink-0 text-sm leading-none">
                          {PRIORITY_FLAGS[t.priority]}
                        </span>
                        <span className="font-medium text-sm min-w-0 truncate flex-1">{t.name}</span>
                      </button>
                      <span className={cn(
                        'text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0',
                        statusMeta.color
                      )}>
                        {statusMeta.label}
                      </span>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                          {t.due_date ? formatDate(t.due_date) : ''}
                        </span>
                        {countdown && (
                          <span className={cn(
                            'text-[10px]',
                            countdown.startsWith('🔥') ? 'text-red-600 font-medium' : 'text-muted-foreground'
                          )}>
                            {countdown}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 员工视图：我的重点任务 */}
        {!canAll && (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">我的重点任务</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => navigate('/tasks')}
              >
                全部任务 <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              {myKeyTasks.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  暂无待处理任务 🎉
                </div>
              ) : (
                <div className="space-y-2">
                  {myKeyTasks.map((t) => {
                    const statusMeta = TASK_STATUS_LABELS[t.status]
                    const typeMeta = TASK_TYPE_LABELS[t.type]
                    const priMeta = PRIORITY_LABELS[t.priority]
                    const overdue = t.status !== 'done' && isOverdue(t.due_date)
                    const countdown = getCountdown(t.due_date, t.start_date)
                    const isOverdueFlag = countdown.startsWith('🔥')
                    return (
                      <button
                        key={t.id}
                        onClick={() => navigate(`/tasks/${t.id}`)}
                        className="w-full text-left p-3 rounded-lg border hover:border-primary hover:bg-muted/30 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5 min-w-0 flex-1">
                            {canEditPriority ? (
                              <button
                                onClick={(e) => cyclePriority(t.id, t.priority, e)}
                                className="shrink-0 text-sm leading-none hover:scale-110 transition-transform cursor-pointer"
                                title={`点击切换优先级：${priMeta.label}`}
                              >
                                {PRIORITY_FLAGS[t.priority]}
                              </button>
                            ) : (
                              <span className="shrink-0 text-sm leading-none">
                                {PRIORITY_FLAGS[t.priority]}
                              </span>
                            )}
                            <div className="font-medium text-sm min-w-0 truncate flex-1">{t.name}</div>
                          </div>
                          <span className={cn(
                            'text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0',
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
                          {countdown && (
                            <span className={cn(
                              'text-[10px] ml-auto',
                              isOverdueFlag ? 'text-red-600 font-medium' : 'text-muted-foreground'
                            )}>
                              {countdown}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 老板视图：进行中大项目 */}
        {canAll && (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">进行中大项目</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => navigate('/projects')}
              >
                全部项目 <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              {activeBPLimited.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  暂无进行中的大项目
                </div>
              ) : (
                <div className="space-y-2">
                  {activeBPLimited.map((p) => {
                    const meta: any = TASK_STATUS_LABELS[p.status as keyof typeof TASK_STATUS_LABELS] || { label: p.status, color: 'bg-slate-100' }
                    return (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/projects/${p.id}`)}
                        className="w-full text-left p-3 rounded-lg border hover:border-primary hover:bg-muted/30 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium text-sm min-w-0 truncate flex-1">{p.name}</div>
                          <span className={cn(
                            'text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0',
                            meta.color
                          )}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                          <span>{formatDate(p.start_date)} → {formatDate(p.end_date)}</span>
                          {p.owner_id && profileMap[p.owner_id] && (
                            <span>· 负责人 {profileMap[p.owner_id]}</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 最近工作动态 */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              最近动态
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={() => navigate('/records')}
            >
              全部记录 <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {!recentRecords || recentRecords.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                还没有操作记录
              </div>
            ) : (
              <div className="relative pl-5 space-y-4">
                <div className="absolute left-1.5 top-1 bottom-1 w-0.5 bg-border" />
                {recentRecords.slice(0, 8).map((r) => {
                  const color = RECORD_ACTION_COLORS[r.action] || 'bg-slate-100 text-slate-700'
                  return (
                    <div key={r.id} className="relative">
                      <div className={cn(
                        'absolute -left-[19px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white',
                        color.split(' ')[0]
                      )} />
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', color)}>
                          {RECORD_ACTION_LABELS[r.action] || r.action}
                        </span>
                        <span className="text-xs font-medium">
                          {r.operator_name || profileMap[r.operator_id] || '系统'}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {formatDateTime(r.created_at)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{r.content}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
