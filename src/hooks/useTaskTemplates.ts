import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useTaskTemplates() {
  return useQuery({
    queryKey: ['task-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('enabled', true)
        .order('sort_order')
      if (error) throw error
      return data as {
        id: string
        key: string
        name: string
        task_category: string
        default_due_days?: number
      }[]
    },
    staleTime: 1000 * 60 * 10
  })
}
