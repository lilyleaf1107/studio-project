import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import type { WorkRecord, RecordAction } from '@/types'

export function useWorkRecords(filters?: {
  operator_id?: string
  big_project_id?: string
  sub_project_id?: string
  task_id?: string
  action?: RecordAction
  limit?: number
}) {
  return useQuery({
    queryKey: ['workRecords', filters],
    queryFn: async (): Promise<WorkRecord[]> => {
      let q = supabase.from('work_records').select('*')
      if (filters?.operator_id) q = q.eq('operator_id', filters.operator_id)
      if (filters?.big_project_id) q = q.eq('big_project_id', filters.big_project_id)
      if (filters?.sub_project_id) q = q.eq('sub_project_id', filters.sub_project_id)
      if (filters?.task_id) q = q.eq('task_id', filters.task_id)
      if (filters?.action) q = q.eq('action', filters.action)
      q = q.order('created_at', { ascending: false })
      if (filters?.limit) q = q.limit(filters.limit)
      const { data, error } = await q
      if (error) throw error
      return data as WorkRecord[]
    }
  })
}

export interface CreateRecordInput {
  action: RecordAction
  content: string
  big_project_id?: string
  sub_project_id?: string
  task_id?: string
  attachment_path?: string
  operator_id?: string
  operator_name?: string
}

export function useCreateWorkRecord() {
  const qc = useQueryClient()
  const profile = useAuthStore((s) => s.profile)
  return useMutation({
    mutationFn: async (input: CreateRecordInput) => {
      const { data, error } = await supabase
        .from('work_records')
        .insert({
          operator_id: input.operator_id || profile?.id,
          operator_name: input.operator_name || profile?.name,
          big_project_id: input.big_project_id,
          sub_project_id: input.sub_project_id,
          task_id: input.task_id,
          action: input.action,
          content: input.content,
          attachment_path: input.attachment_path
        })
        .select()
        .single()
      if (error) throw error
      return data as WorkRecord
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workRecords'] })
    }
  })
}

export const RECORD_ACTION_LABELS: Record<RecordAction, string> = {
  assign: '分配任务',
  start: '开始处理',
  submit: '提交验收',
  upload: '上传文件',
  stage_change: '阶段变更',
  approve: '验收通过',
  reject: '验收退回',
  delay_request: '申请延期',
  delay_system: '系统标延期',
  comment: '备注说明',
  create_project: '创建项目',
  archive: '归档项目'
}

export const RECORD_ACTION_COLORS: Record<RecordAction, string> = {
  assign: 'bg-indigo-50 text-indigo-700',
  start: 'bg-blue-50 text-blue-700',
  submit: 'bg-purple-50 text-purple-700',
  upload: 'bg-teal-50 text-teal-700',
  stage_change: 'bg-cyan-50 text-cyan-700',
  approve: 'bg-emerald-50 text-emerald-700',
  reject: 'bg-orange-50 text-orange-700',
  delay_request: 'bg-amber-50 text-amber-700',
  delay_system: 'bg-red-50 text-red-700',
  comment: 'bg-slate-100 text-slate-700',
  create_project: 'bg-indigo-50 text-indigo-700',
  archive: 'bg-gray-100 text-gray-600'
}
