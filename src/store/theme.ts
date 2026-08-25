import { create } from 'zustand'

export interface ThemePreview {
  bg: string
  active: string
}

export interface ThemeOption {
  key: 'default' | 'blue' | 'green' | 'purple' | 'pink' | 'amber'
  name: string
  description: string
  preview: ThemePreview
}

export const THEMES: ThemeOption[] = [
  {
    key: 'default',
    name: '默认（深石板）',
    description: '深石板侧栏 + 雾蓝灰强调',
    preview: { bg: '#1f2937', active: '#5b8def' }
  },
  {
    key: 'blue',
    name: '雾蓝灰',
    description: '雾蓝侧栏 + 灰蓝强调',
    preview: { bg: '#e8edf2', active: '#7a93a8' }
  },
  {
    key: 'green',
    name: '灰绿',
    description: '灰绿侧栏 + 莫兰迪绿强调',
    preview: { bg: '#e6ede9', active: '#7a9b8e' }
  },
  {
    key: 'purple',
    name: '雾紫灰',
    description: '雾紫侧栏 + 灰紫强调',
    preview: { bg: '#ebe8f0', active: '#9088a8' }
  },
  {
    key: 'pink',
    name: '藕粉灰',
    description: '藕粉侧栏 + 灰粉强调',
    preview: { bg: '#efe6e8', active: '#a88a93' }
  },
  {
    key: 'amber',
    name: '米灰',
    description: '米灰侧栏 + 莫兰迪黄强调',
    preview: { bg: '#efe9e0', active: '#a8957a' }
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
    }
    set({ theme: key })
  },

  init: () => {
    let saved: string | null = null
    try {
      saved = localStorage.getItem(STORAGE_KEY)
    } catch (e) {
    }
    const theme = saved || 'default'
    if (theme !== 'default') {
      document.documentElement.setAttribute('data-theme', theme)
    }
    set({ theme })
  }
}))