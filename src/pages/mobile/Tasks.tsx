import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Loading from '@/components/Loading'
import { useTasks } from '@/hooks/useTasks'
import {
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_FLAGS
} from '@/lib/settings'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { Search } from 'lucide-react'
import type { TaskStatus } from '@/types'

export default function Tasks() {
  const profile = useAuthStore((s) => s.profile)
  const userId = profile?.id
  const navigate = useNavigate()

  const filters = useMemo(() => userId ? { assignee_id: userId } : undefined, [userId])
  const { data: tasks, isLoading } = useTasks(filters)

  const [tab, setTab] = useState<'all' | TaskStatus>('all')
  const [q, setQ] = useState('')

  const tabs: { key: 'all' | TaskStatus; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'todo', label: '待办' },
    { key: 'doing', label: '进行中' },
    { key: 'review', label: '待验收' },
    { key: 'returned', label: '被退回' },
    { key: 'done', label: '已完成' }
  ]

  const filtered = useMemo(() => {
    let list = tasks || []
    if (tab !== 'all') list = list.filter((t) => t.status === tab)
    if (q.trim()) list = list.filter((t) => t.name.includes(q.trim()))
    return list.sort((a, b) => {
      // 未完成在前，按截止日期升序
      if ((a.status === 'done') !== (b.status === 'done')) {
        return a.status === 'done' ? 1 : -1
      }
      const av = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
      const bv = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
      return av - bv
    })
  }, [tasks, tab, q])

  if (isLoading) return <Loading />

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">我的任务</h1>

      <div className="flex gap-2 -mx-1 overflow-x-auto px-1 pb-1">
        {tabs.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={tab === t.key ? 'default' : 'outline'}
            className="h-8 shrink-0 text-xs"
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key !== 'all' && (
              <span className="ml-1 opacity-70">
                {(tasks || []).filter((x) => x.status === t.key).length}
              </span>
            )}
          </Button>
        ))}
      </div>

      <Input
        placeholder="搜索任务名"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        prefix={<Search className="h-4 w-4 text-muted-foreground" />}
      />

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              没有匹配的任务
            </CardContent>
          </Card>
        ) : (
          filtered.map((t) => {
            const statusMeta = TASK_STATUS_LABELS[t.status]
            const typeMeta = TASK_TYPE_LABELS[t.type]
            const priMeta = PRIORITY_LABELS[t.priority]
            const overdue = t.status !== 'done' && isOverdue(t.due_date)
            return (
              <button
                key={t.id}
                onClick={() => navigate(`/tasks/${t.id}`)}
                className="w-full text-left"
              >
                <Card className="hover:border-primary hover:bg-muted/20 transition-all">
                  <CardContent className="p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-1.5 min-w-0 flex-1">
                        <span className="shrink-0 text-sm leading-none">{PRIORITY_FLAGS[t.priority]}</span>
                        <div className="font-medium text-sm min-w-0 truncate flex-1">{t.name}</div>
                      </div>
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap shrink-0',
                        overdue ? 'bg-red-50 text-red-700' : statusMeta.color
                      )}>
                        {overdue ? '逾期' : statusMeta.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded', typeMeta.color)}>
                        {typeMeta.label}
                      </span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded', priMeta.color)}>
                        {priMeta.label}
                      </span>
                      <span className={cn(
                        'text-[10px] ml-auto',
                        overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'
                      )}>
                        {formatDate(t.due_date)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
