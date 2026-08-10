import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Task, TaskStatus, TaskType, TaskPriority } from '@/types'

export function useTasks(filters?: {
  assignee_id?: string
  big_project_id?: string
  sub_project_id?: string
  status?: TaskStatus
  type?: TaskType
}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async (): Promise<Task[]> => {
      let q = supabase.from('tasks').select('*')
      if (filters?.assignee_id) q = q.eq('assignee_id', filters.assignee_id)
      if (filters?.big_project_id) q = q.eq('big_project_id', filters.big_project_id)
      if (filters?.sub_project_id) q = q.eq('sub_project_id', filters.sub_project_id)
      if (filters?.status) q = q.eq('status', filters.status)
      if (filters?.type) q = q.eq('type', filters.type)
      const { data, error } = await q.order('created_at', { ascending: false })
      if (error) throw error
      return data as Task[]
    }
  })
}

export function useTask(id?: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async (): Promise<Task | null> => {
      if (!id) return null
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data as Task | null
    },
    enabled: !!id
  })
}

export interface CreateTaskInput {
  name: string
  type: TaskType
  task_category?: string
  big_project_id?: string
  sub_project_id?: string
  stage?: string
  assignee_id: string
  collaborator_ids?: string[]
  due_date: string
  priority?: TaskPriority
  description?: string
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          name: input.name,
          type: input.type,
          task_category: input.task_category,
          big_project_id: input.big_project_id,
          sub_project_id: input.sub_project_id,
          stage: input.stage,
          assignee_id: input.assignee_id,
          collaborator_ids: input.collaborator_ids,
          due_date: input.due_date,
          priority: input.priority || 'medium',
          status: 'todo',
          description: input.description
        })
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    }
  })
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, patch }: { id: string; status: TaskStatus; patch?: Partial<Task> }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status, ...patch })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['task'] })
    }
  })
}
