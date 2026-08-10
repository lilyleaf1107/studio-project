import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('缺少 Supabase 配置，请检查 .env 文件')
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
})

export const STORAGE_BUCKETS = {
  FILES: 'project-files'
} as const
