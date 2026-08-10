import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { SubProject, SubProjectStatus } from '@/types'

export function useSubProjects(bigProjectId?: string) {
  return useQuery({
    queryKey: ['sub-projects', bigProjectId],
    queryFn: async (): Promise<SubProject[]> => {
      let q = supabase.from('sub_projects').select('*')
      if (bigProjectId) q = q.eq('big_project_id', bigProjectId)
      const { data, error } = await q.order('created_at', { ascending: false })
      if (error) throw error
      return data as SubProject[]
    },
    enabled: true
  })
}

export function useSubProject(id?: string) {
  return useQuery({
    queryKey: ['sub-project', id],
    queryFn: async (): Promise<SubProject | null> => {
      if (!id) return null
      const { data, error } = await supabase
        .from('sub_projects')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data as SubProject | null
    },
    enabled: !!id
  })
}

export function useCreateSubProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<SubProject> & {
      big_project_id: string
      name: string
      owner_id: string
    }) => {
      const { data, error } = await supabase
        .from('sub_projects')
        .insert({
          big_project_id: input.big_project_id,
          name: input.name,
          owner_id: input.owner_id,
          stage: input.stage,
          status: input.status || 'active',
          start_date: input.start_date,
          end_date: input.end_date,
          description: input.description
        })
        .select()
        .single()
      if (error) throw error
      return data as SubProject
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['sub-projects'] })
      qc.invalidateQueries({ queryKey: ['sub-projects', vars.big_project_id] })
    }
  })
}

export function useUpdateSubProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SubProject> }) => {
      const { error } = await supabase.from('sub_projects').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sub-projects'] })
      qc.invalidateQueries({ queryKey: ['sub-project'] })
    }
  })
}
