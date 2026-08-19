import { create } from 'zustand'

export interface ThemePreview {
  bg: string
  active: string
}

export interface ThemeOption {
  key: 'default' | 'blue' | 'red' | 'green' | 'purple'
  name: string
  description: string
  preview: ThemePreview
}

export const THEMES: ThemeOption[] = [
  {
    key: 'default',
    name: '默认（青色）',
    description: '浅灰蓝侧栏 + 青色强调',
    preview: { bg: '#334155', active: '#14b8a6' }
  },
  {
    key: 'blue',
    name: '蓝白',
    description: '浅蓝侧栏 + 亮蓝强调',
    preview: { bg: '#3b5778', active: '#3b82f6' }
  },
  {
    key: 'red',
    name: '红白',
    description: '浅红侧栏 + 亮红强调',
    preview: { bg: '#8b4a4a', active: '#ef4444' }
  },
  {
    key: 'green',
    name: '绿白',
    description: '浅绿侧栏 + 亮绿强调',
    preview: { bg: '#4a6b50', active: '#22c55e' }
  },
  {
    key: 'purple',
    name: '紫白',
    description: '浅紫侧栏 + 亮紫强调',
    preview: { bg: '#6b5188', active: '#a855f7' }
  }
]

const STORAGE_KEY = 'app-theme'

interface ThemeState {
  theme: string
  setTheme: (key: string) => void
  init: () => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'default',

  setTheme: (key: string) => {
    if (key === 'default') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', key)
    }
    try {
      localStorage.setItem(STORAGE_KEY, key)
    } catch (e) {
      // 忽略 localStorage 不可用情况
    }
    set({ theme: key })
  },

  init: () => {
    let saved: string | null = null
    try {
      saved = localStorage.getItem(STORAGE_KEY)
    } catch (e) {
      // 忽略 localStorage 不可用情况
    }
    const theme = saved || 'default'
    if (theme !== 'default') {
      document.documentElement.setAttribute('data-theme', theme)
    }
    set({ theme })
  }
}))
