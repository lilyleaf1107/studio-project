import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useStages() {
  return useQuery({
    queryKey: ['stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .eq('enabled', true)
        .order('sort_order')
      if (error) throw error
      return data as { id: string; key: string; name: string; enabled: boolean; sort_order: number }[]
    },
    staleTime: 1000 * 60 * 10
  })
}

export function useStageName(key?: string) {
  const { data } = useStages()
  if (!key) return ''
  return data?.find((s) => s.key === key)?.name || key
}
