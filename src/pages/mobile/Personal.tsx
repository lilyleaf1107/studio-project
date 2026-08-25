import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { UserCog, Plus, Trash2, Check, ChevronRight, Pencil } from 'lucide-react'
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
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { ROLE_LABELS, JOB_TITLE_PRESETS, PRIORITY_FLAGS, TASK_STATUS_LABELS, TASK_TYPE_LABELS } from '@/lib/settings'
import { canEditJobTitle } from '@/lib/permissions'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import type { Task } from '@/types'

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

  const [editName, setEditName] = useState(false)
  const [nameValue, setNameValue] = useState(profile?.name || '')
  const [editJobTitle, setEditJobTitle] = useState(false)
  const [jobTitleValue, setJobTitleValue] = useState(profile?.job_title || '')
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

  const sortedTasks = [...(myTasks || [])].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  )

  const canEditSelfJobTitle = canEditJobTitle(profile?.role, profile?.role, true)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <UserCog className="h-5 w-5 text-primary" />个人管理
        </h1>
      </div>

      {/* 个人信息 */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-base font-bold text-primary">
              {profile?.name?.slice(0, 1) || 'U'}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">角色</div>
              <div className="font-medium text-sm">{profile?.role ? ROLE_LABELS[profile.role] : '-'}</div>
            </div>
          </div>

          {/* 昵称 */}
          <div className="flex items-center gap-2">
            <span className="w-16 text-xs text-muted-foreground shrink-0">昵称</span>
            {editName ? (
              <div className="flex items-center gap-1.5 flex-1">
                <Input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  className="h-8 flex-1"
                  autoFocus
                />
                <Button
                  size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 shrink-0"
                  onClick={() => updateProfileMutation.mutate({ name: nameValue })}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon" variant="ghost" className="h-8 w-8 text-red-500 shrink-0"
                  onClick={() => { setEditName(false); setNameValue(profile?.name || '') }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-1">
                <span className="font-medium text-sm flex-1">{profile?.name || '未设置'}</span>
                <Button
                  size="icon" variant="ghost" className="h-7 w-7 shrink-0"
                  onClick={() => { setEditName(true); setNameValue(profile?.name || '') }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* 身份卡 */}
          <div className="flex items-center gap-2">
            <span className="w-16 text-xs text-muted-foreground shrink-0">身份卡</span>
            {editJobTitle ? (
              <div className="flex items-center gap-1.5 flex-1">
                <Select value={jobTitleValue} onValueChange={setJobTitleValue}>
                  <SelectTrigger className="h-8 flex-1">
                    <SelectValue placeholder="选择身份卡" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TITLE_PRESETS.map((jt) => (
                      <SelectItem key={jt} value={jt}>{jt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 shrink-0"
                  onClick={() => updateProfileMutation.mutate({ job_title: jobTitleValue })}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon" variant="ghost" className="h-8 w-8 text-red-500 shrink-0"
                  onClick={() => { setEditJobTitle(false); setJobTitleValue(profile?.job_title || '') }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-1">
                <span className="font-medium text-sm flex-1">{profile?.job_title || '未设置'}</span>
                {canEditSelfJobTitle && (
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7 shrink-0"
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

      {/* 个人待办 */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="font-medium text-sm">个人待办</div>
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
              className="flex-1 h-9"
            />
            <Button type="submit" size="sm" className="gap-1 shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </form>

          <div className="space-y-1.5">
            {todos?.length === 0 && (
              <div className="text-xs text-muted-foreground py-3 text-center">暂无待办</div>
            )}
            {todos?.map((todo) => (
              <div key={todo.id} className="flex items-center gap-2 p-2 rounded-lg border">
                <button
                  onClick={() => toggleTodoMutation.mutate({ id: todo.id, done: !todo.done })}
                  className={cn(
                    'h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                    todo.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                  )}
                  style={{ height: 18, width: 18 }}
                >
                  {todo.done && <Check className="h-2.5 w-2.5 text-white" />}
                </button>
                <span className={cn(
                  'flex-1 text-sm',
                  todo.done && 'line-through text-muted-foreground'
                )}>
                  {todo.title}
                </span>
                <Button
                  size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-500 shrink-0"
                  onClick={() => deleteTodoMutation.mutate(todo.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 我的任务 */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="font-medium text-sm">我的任务（{sortedTasks.length}）</div>
          {isLoading && <div className="text-xs text-muted-foreground py-3 text-center">加载中...</div>}
          {!isLoading && sortedTasks.length === 0 && (
            <div className="text-xs text-muted-foreground py-3 text-center">暂无任务</div>
          )}
          {sortedTasks.map((task) => {
            const statusMeta = TASK_STATUS_LABELS[task.status] || TASK_STATUS_LABELS.todo
            const typeMeta = TASK_TYPE_LABELS[task.type] || TASK_TYPE_LABELS.anytime
            const overdue = task.status !== 'done' && isOverdue(task.due_date)
            return (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="flex items-center gap-2 p-2.5 rounded-lg border active:bg-muted/40 cursor-pointer transition-colors"
              >
                <span className="text-sm shrink-0">{PRIORITY_FLAGS[task.priority]}</span>
                <div className="flex-1 min-w-0">
                  <div className={cn('font-medium text-sm truncate', overdue && 'text-red-600')}>
                    {task.name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', statusMeta.color)}>
                      {overdue && task.status !== 'delayed' ? '已逾期' : statusMeta.label}
                    </span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', typeMeta.color)}>
                      {typeMeta.label}
                    </span>
                    {task.due_date && (
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
