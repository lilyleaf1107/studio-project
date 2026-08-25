import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import type { PersonalEvent } from '@/types'

export interface CreateEventInput {
  title: string
  event_date?: string
  start_time?: string
  end_time?: string
  recurrence_rule?: string
  color?: string
}

export function usePersonalEvents(range?: { start?: string; end?: string }) {
  const userId = useAuthStore((s) => s.profile?.id)
  return useQuery({
    queryKey: ['personal-events', userId, range],
    queryFn: async (): Promise<PersonalEvent[]> => {
      let q = supabase.from('personal_todos').select('*')
      q = q.eq('user_id', userId)
      if (range?.start) q = q.gte('event_date', range.start)
      if (range?.end) q = q.lte('event_date', range.end)
      const { data, error } = await q.order('event_date', { ascending: true })
      if (error) throw error
      return data as PersonalEvent[]
    },
    enabled: !!userId
  })
}

export function useCreatePersonalEvent() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.profile?.id)
  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const { data, error } = await supabase
        .from('personal_todos')
        .insert({
          user_id: userId,
          title: input.title,
          event_date: input.event_date,
          start_time: input.start_time,
          end_time: input.end_time,
          recurrence_rule: input.recurrence_rule,
          color: input.color || 'emerald'
        })
        .select()
        .single()
      if (error) throw error
      return data as PersonalEvent
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal-events'], exact: false })
    }
  })
}

export function useUpdatePersonalEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PersonalEvent> }) => {
      const { error } = await supabase
        .from('personal_todos')
        .update(patch)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal-events'], exact: false })
    }
  })
}

export function useDeletePersonalEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('personal_todos')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal-events'], exact: false })
    }
  })
}