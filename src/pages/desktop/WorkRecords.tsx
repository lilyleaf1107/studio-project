import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, ChevronRight, FolderGit2, CheckSquare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import Loading from '@/components/Loading'
import {
  useWorkRecords,
  RECORD_ACTION_LABELS,
  RECORD_ACTION_COLORS
} from '@/hooks/useWorkRecords'
import { useProfiles } from '@/hooks/useProfiles'
import { useBigProjects } from '@/hooks/useProjects'
import { useTasks } from '@/hooks/useTasks'
import { canViewAllRecords } from '@/lib/permissions'
import { cn, formatDateTime } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import type { RecordAction } from '@/types'

export default function WorkRecords() {
  const profile = useAuthStore((s) => s.profile)
  const canAll = canViewAllRecords(profile?.role)
  const userId = profile?.id
  const navigate = useNavigate()

  const [scope, setScope] = useState<'all' | 'mine'>(canAll ? 'all' : 'mine')
  const [actionF, setActionF] = useState<string>('all')
  const [bpF, setBpF] = useState<string>('all')
  const [q, setQ] = useState('')

  const filters = useMemo(() => {
    const f: any = {}
    if (scope === 'mine' && userId) f.operator_id = userId
    if (actionF !== 'all') f.action = actionF
    if (bpF !== 'all') f.big_project_id = bpF
    return f
  }, [scope, userId, actionF, bpF])

  const { data: records, isLoading } = useWorkRecords(filters)
  const { data: profiles } = useProfiles()
  const { data: bigProjects } = useBigProjects()
  const { data: tasks } = useTasks()

  const profileMap: Record<string, string> = {}
  profiles?.forEach((p) => (profileMap[p.id] = p.name))
  const bpMap: Record<string, string> = {}
  bigProjects?.forEach((p) => (bpMap[p.id] = p.name))
  const taskMap: Record<string, string> = {}
  tasks?.forEach((t) => (taskMap[t.id] = t.name))

  const filtered = (records || []).filter((r) => {
    if (!q) return true
    const hay = (r.content + (r.operator_name || '') + (profileMap[r.operator_id] || '')).toLowerCase()
    return hay.includes(q.toLowerCase())
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">工作记录</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {canAll
              ? `全部工作流水（${records?.length || 0}）`
              : `我的工作记录（${records?.length || 0}）`}
          </p>
        </div>
      </div>

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
                <SelectItem value="all">全部人员</SelectItem>
                <SelectItem value="mine">只看我的</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select value={actionF} onValueChange={setActionF}>
            <SelectTrigger className="w-40"><SelectValue placeholder="操作类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {Object.entries(RECORD_ACTION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={bpF} onValueChange={setBpF}>
            <SelectTrigger className="w-48"><SelectValue placeholder="所属大项目" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部项目</SelectItem>
              {(bigProjects || []).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="搜索内容/人员"
            className="max-w-xs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            prefix={<Search className="h-4 w-4 text-muted-foreground" />}
          />
        </CardContent>
      </Card>

      <Card>
        {isLoading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            没有匹配的工作记录
          </CardContent>
        ) : (
          <CardContent className="p-6">
            <div className="relative pl-6 space-y-6">
              <div className="absolute left-1.5 top-1 bottom-1 w-0.5 bg-border" />
              {filtered.map((r) => {
                const color = RECORD_ACTION_COLORS[r.action] || 'bg-slate-100 text-slate-700'
                const bpName = bpMap[r.big_project_id || '']
                const taskName = taskMap[r.task_id || '']
                return (
                  <div key={r.id} className="relative">
                    <div className={cn(
                      'absolute -left-[22px] top-1 h-3 w-3 rounded-full ring-2 ring-white',
                      color.split(' ')[0]
                    )} />
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', color)}>
                        {RECORD_ACTION_LABELS[r.action as RecordAction] || r.action}
                      </span>
                      <div className="flex items-center gap-1.5 text-sm">
                        <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold">
                          {(r.operator_name || profileMap[r.operator_id] || '?').slice(0, 1)}
                        </div>
                        <span className="font-medium">
                          {r.operator_name || profileMap[r.operator_id] || '系统'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(r.created_at)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap mb-1.5">
                      {r.content}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {bpName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          <FolderGit2 className="h-3 w-3" /> {bpName}
                        </span>
                      )}
                      {taskName && (
                        <button
                          onClick={() => navigate(`/tasks/${r.task_id}`)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                        >
                          <CheckSquare className="h-3 w-3" /> {taskName}
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
