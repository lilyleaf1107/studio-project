import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Loading from '@/components/Loading'
import { useTasks } from '@/hooks/useTasks'
import { useProfiles } from '@/hooks/useProfiles'
import { useBigProjects } from '@/hooks/useProjects'
import {
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  PRIORITY_LABELS,
  TASK_CATEGORIES
} from '@/lib/settings'
import { canViewAllProjects } from '@/lib/permissions'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import type { TaskStatus, TaskType } from '@/types'

export default function Tasks() {
  const profile = useAuthStore((s) => s.profile)
  const canAll = canViewAllProjects(profile?.role)
  const userId = profile?.id
  const navigate = useNavigate()

  const [statusF, setStatusF] = useState<string>('all')
  const [typeF, setTypeF] = useState<string>('all')
  const [priorityF, setPriorityF] = useState<string>('all')
  const [q, setQ] = useState('')
  const [scope, setScope] = useState<'all' | 'mine'>(canAll ? 'all' : 'mine')

  const filters = useMemo(() => {
    const f: any = {}
    if (scope === 'mine' && userId) f.assignee_id = userId
    if (statusF !== 'all') f.status = statusF
    if (typeF !== 'all') f.type = typeF
    return f
  }, [scope, userId, statusF, typeF])

  const { data: tasks, isLoading } = useTasks(filters)
  const { data: profiles } = useProfiles()
  const { data: bigProjects } = useBigProjects()

  const profileMap: Record<string, string> = {}
  profiles?.forEach((p) => (profileMap[p.id] = p.name))
  const bpMap: Record<string, string> = {}
  bigProjects?.forEach((p) => (bpMap[p.id] = p.name))
  const categoryMap: Record<string, string> = {}
  TASK_CATEGORIES.forEach((c) => (categoryMap[c.key] = c.name))

  const filtered = (tasks || [])
    .filter((t) => priorityF === 'all' || t.priority === priorityF)
    .filter((t) => !q || t.name.includes(q))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">任务中心</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {canAll
              ? `全部任务（${tasks?.length || 0}）`
              : `我参与的任务（${tasks?.length || 0}）`}
          </p>
        </div>
      </div>

      {/* 筛选条 */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            筛选：
          </div>
          {canAll && (
            <Select value={scope} onValueChange={(v: 'all' | 'mine') => setScope(v)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部任务</SelectItem>
                <SelectItem value="mine">我负责的</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Input
            placeholder="搜索任务名"
            className="max-w-xs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            prefix={<Search className="h-4 w-4 text-muted-foreground" />}
          />
          <Select value={typeF} onValueChange={setTypeF}>
            <SelectTrigger className="w-40"><SelectValue placeholder="任务类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger className="w-40"><SelectValue placeholder="状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityF} onValueChange={setPriorityF}>
            <SelectTrigger className="w-32"><SelectValue placeholder="优先级" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 列表 */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <Loading />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>任务名称</TableHead>
                <TableHead className="hidden md:table-cell">类型</TableHead>
                <TableHead>负责人</TableHead>
                <TableHead className="hidden lg:table-cell">截止</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    没有任务。老板/管理员可在「快速建任务」页面创建。
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((t) => {
                const statusMeta = TASK_STATUS_LABELS[t.status] || TASK_STATUS_LABELS.todo
                const typeMeta = TASK_TYPE_LABELS[t.type]
                const priMeta = PRIORITY_LABELS[t.priority]
                const overdue =
                  t.status !== 'done' && t.status !== 'delayed' && isOverdue(t.due_date)
                return (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => navigate(`/tasks/${t.id}`)}
                  >
                    <TableCell className="min-w-0">
                      <div className="font-medium truncate pr-2">{t.name}</div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {t.task_category && (
                          <span className="text-[11px] text-muted-foreground">
                            {categoryMap[t.task_category] || t.task_category}
                          </span>
                        )}
                        {t.big_project_id && bpMap[t.big_project_id] && (
                          <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                            · {bpMap[t.big_project_id]}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        typeMeta.color
                      )}>
                        {typeMeta.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold shrink-0">
                          {(profileMap[t.assignee_id] || '?').slice(0, 1)}
                        </div>
                        <span className="text-sm truncate">{profileMap[t.assignee_id] || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm whitespace-nowrap">
                      <div className={cn(overdue && 'text-red-600 font-medium')}>
                        {formatDate(t.due_date)}
                      </div>
                      {overdue && <div className="text-[11px] text-red-500">已逾期</div>}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        priMeta.color
                      )}>
                        {priMeta.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap',
                        overdue && t.status !== 'delayed' ? 'bg-red-50 text-red-700' : statusMeta.color
                      )}>
                        {overdue && t.status !== 'delayed' ? '已逾期' : statusMeta.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
