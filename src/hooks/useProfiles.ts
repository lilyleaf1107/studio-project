import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase.from('profiles').select('*').order('name')
      if (error) throw error
      return data as Profile[]
    },
    staleTime: 1000 * 60 * 5
  })
}

export function useProfileMap() {
  const { data } = useProfiles()
  const map: Record<string, Profile> = {}
  data?.forEach((p) => (map[p.id] = p))
  return map
}

export function useMyProfile() {
  return useQuery({
    queryKey: ['my-profile'],
    queryFn: async (): Promise<Profile | null> => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .maybeSingle()
      if (error) throw error
      return data as Profile | null
    },
    staleTime: 1000 * 60
  })
}
