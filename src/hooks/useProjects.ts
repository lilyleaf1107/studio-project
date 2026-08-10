import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { BigProject, ProjectStatus } from '@/types'

export function useBigProjects() {
  return useQuery({
    queryKey: ['big-projects'],
    queryFn: async (): Promise<BigProject[]> => {
      const { data, error } = await supabase
        .from('big_projects')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as BigProject[]
    }
  })
}

export function useBigProject(id?: string) {
  return useQuery({
    queryKey: ['big-project', id],
    queryFn: async (): Promise<BigProject | null> => {
      if (!id) return null
      const { data, error } = await supabase
        .from('big_projects')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data as BigProject | null
    },
    enabled: !!id
  })
}

export function useCreateBigProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<BigProject> & {
      name: string
      owner_id: string
      start_date: string
      end_date: string
    }) => {
      const { data, error } = await supabase
        .from('big_projects')
        .insert({
          name: input.name,
          code: input.code,
          owner_id: input.owner_id,
          start_date: input.start_date,
          end_date: input.end_date,
          status: input.status || 'active',
          description: input.description
        })
        .select()
        .single()
      if (error) throw error
      return data as BigProject
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['big-projects'] })
  })
}

export function useUpdateBigProjectStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProjectStatus }) => {
      const { error } = await supabase.from('big_projects').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['big-projects'] })
      qc.invalidateQueries({ queryKey: ['big-project'] })
    }
  })
}
