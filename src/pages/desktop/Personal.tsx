import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UserCog, Plus, Trash2, Check, ChevronRight, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { ROLE_LABELS, JOB_TITLE_PRESETS, PRIORITY_FLAGS, TASK_STATUS_LABELS, TASK_TYPE_LABELS } from '@/lib/settings'
import { canEditJobTitle } from '@/lib/permissions'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types'

interface TodoItem {
  id: string
  user_id: string
  title: string
  done: boolean
  created_at: string
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

export default function PersonalPage() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const qc = useQueryClient()
  const userId = profile?.id

  // 昵称和身份卡编辑
  const [editName, setEditName] = useState(false)
  const [nameValue, setNameValue] = useState(profile?.name || '')
  const [editJobTitle, setEditJobTitle] = useState(false)
  const [jobTitleValue, setJobTitleValue] = useState(profile?.job_title || '')

  // 个人 TodoList
  const [newTodo, setNewTodo] = useState('')

  const { data: myTasks, isLoading } = useQuery({
    queryKey: ['personal-tasks', userId],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assignee_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Task[]
    },
    enabled: !!userId
  })

  const { data: todos } = useQuery({
    queryKey: ['personal-todos', userId],
    queryFn: async (): Promise<TodoItem[]> => {
      const { data, error } = await supabase
        .from('personal_todos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as TodoItem[]
    },
    enabled: !!userId
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name?: string; job_title?: string }) => {
      await updateProfile(data)
    },
    onSuccess: () => {
      toast.success('已更新')
      setEditName(false)
      setEditJobTitle(false)
    },
    onError: (e: any) => toast.error(e?.message || '更新失败')
  })

  const addTodoMutation = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase
        .from('personal_todos')
        .insert({ user_id: userId, title })
      if (error) throw error
    },
    onSuccess: () => {
      setNewTodo('')
      qc.invalidateQueries({ queryKey: ['personal-todos', userId] })
    },
    onError: (e: any) => toast.error(e?.message || '添加失败')
  })

  const toggleTodoMutation = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from('personal_todos')
        .update({ done })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal-todos', userId] })
    }
  })

  const deleteTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('personal_todos')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal-todos', userId] })
    }
  })

  // 分组任务
  const myCreatedTasks = myTasks?.filter((t) => true) || [] // 所有分配给自己的任务
  const sortedTasks = [...myCreatedTasks].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  )

  const canEditSelfJobTitle = canEditJobTitle(profile?.role, profile?.role, true)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <UserCog className="h-6 w-6 text-indigo-600" />
          个人管理
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          管理个人信息、查看任务和个人待办
        </p>
      </div>

      {/* 个人信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">个人信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-700">
              {profile?.name?.slice(0, 1) || 'U'}
            </div>
            <div>
              <div className="text-sm text-muted-foreground">角色</div>
              <div className="font-medium">{profile?.role ? ROLE_LABELS[profile.role] : '-'}</div>
            </div>
          </div>

          {/* 昵称 */}
          <div className="flex items-center gap-3">
            <Label className="w-20 text-sm text-muted-foreground">昵称</Label>
            {editName ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  className="max-w-xs h-8"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-emerald-600"
                  onClick={() => updateProfileMutation.mutate({ name: nameValue })}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-500"
                  onClick={() => { setEditName(false); setNameValue(profile?.name || '') }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <span className="font-medium">{profile?.name || '未设置'}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => { setEditName(true); setNameValue(profile?.name || '') }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* 身份卡 */}
          <div className="flex items-center gap-3">
            <Label className="w-20 text-sm text-muted-foreground">身份卡</Label>
            {editJobTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <Select value={jobTitleValue} onValueChange={setJobTitleValue}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue placeholder="选择身份卡" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TITLE_PRESETS.map((jt) => (
                      <SelectItem key={jt} value={jt}>{jt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-emerald-600"
                  onClick={() => updateProfileMutation.mutate({ job_title: jobTitleValue })}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-500"
                  onClick={() => { setEditJobTitle(false); setJobTitleValue(profile?.job_title || '') }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <span className="font-medium">{profile?.job_title || '未设置'}</span>
                {canEditSelfJobTitle && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => { setEditJobTitle(true); setJobTitleValue(profile?.job_title || '') }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 个人 TodoList */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">个人待办</CardTitle>
          <CardDescription className="mt-1">
            自己记录的待办事项，和项目任务分开管理
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (newTodo.trim()) addTodoMutation.mutate(newTodo.trim())
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="输入待办事项..."
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="gap-2">
              <Plus className="h-4 w-4" />
              添加
            </Button>
          </form>

          <div className="space-y-2">
            {todos?.length === 0 && (
              <div className="text-sm text-slate-400 py-4 text-center">暂无待办</div>
            )}
            {todos?.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                <button
                  onClick={() => toggleTodoMutation.mutate({ id: todo.id, done: !todo.done })}
                  className={cn(
                    'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                    todo.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                  )}
                >
                  {todo.done && <Check className="h-3 w-3 text-white" />}
                </button>
                <span className={cn(
                  'flex-1 text-sm',
                  todo.done && 'line-through text-muted-foreground'
                )}>
                  {todo.title}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-400 hover:text-red-500"
                  onClick={() => deleteTodoMutation.mutate(todo.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 我的任务 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">我的任务（{sortedTasks.length}）</CardTitle>
          <CardDescription className="mt-1">
            分配给我的所有任务，按优先级排序
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <div className="text-sm text-slate-400 py-4 text-center">加载中...</div>}
          {!isLoading && sortedTasks.length === 0 && (
            <div className="text-sm text-slate-400 py-4 text-center">暂无任务</div>
          )}
          {sortedTasks.map((task) => {
            const statusMeta = TASK_STATUS_LABELS[task.status] || TASK_STATUS_LABELS.todo
            const typeMeta = TASK_TYPE_LABELS[task.type] || TASK_TYPE_LABELS.anytime
            const overdue = task.status !== 'done' && isOverdue(task.due_date)
            return (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <span className="text-base shrink-0">{PRIORITY_FLAGS[task.priority]}</span>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    'font-medium text-sm truncate',
                    overdue && 'text-red-600'
                  )}>
                    {task.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', statusMeta.color)}>
                      {overdue && task.status !== 'delayed' ? '已逾期' : statusMeta.label}
                    </span>
                    <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', typeMeta.color)}>
                      {typeMeta.label}
                    </span>
                    {task.due_date && (
                      <span className="text-[11px] text-slate-500">
                        截止：{formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
