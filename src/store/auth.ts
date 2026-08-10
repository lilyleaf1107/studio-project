import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types'

interface AuthState {
  user: { id: string; email?: string } | null
  profile: Profile | null
  loading: boolean
  init: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  async init() {
    set({ loading: true })
    const { data } = await supabase.auth.getSession()
    const user = data.session?.user ?? null
    set({ user: user ? { id: user.id, email: user.email ?? undefined } : null })
    if (user) {
      await get().refreshProfile()
    }
    set({ loading: false })

    supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      set({ user: u ? { id: u.id, email: u.email ?? undefined } : null })
      if (u) {
        get().refreshProfile()
      } else {
        set({ profile: null })
      }
    })
  },

  async login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },

  async register(name: string, email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    })
    if (error) throw error
    if (!data.user) throw new Error('注册失败')
  },

  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async refreshProfile() {
    const user = get().user
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (error) {
      console.error('加载用户信息失败', error)
      return
    }
    if (data) {
      set({ profile: { ...data, email: user.email } as Profile })
    }
  }
}))

export function useRole(): UserRole | undefined {
  return useAuthStore((s) => s.profile?.role)
}
