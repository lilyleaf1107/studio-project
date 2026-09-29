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
    name: '档案橄榄',
    description: '羊皮纸侧栏 + 橄榄绿强调',
    preview: { bg: '#ede4d0', active: '#5a6b3f' }
  },
  {
    key: 'blue',
    name: '档案靛蓝',
    description: '羊皮纸侧栏 + 靛蓝强调',
    preview: { bg: '#e6e2d8', active: '#4a6478' }
  },
  {
    key: 'green',
    name: '档案苔绿',
    description: '羊皮纸侧栏 + 苔绿强调',
    preview: { bg: '#e8e6d6', active: '#5a6b3f' }
  },
  {
    key: 'purple',
    name: '档案茄紫',
    description: '羊皮纸侧栏 + 茄紫强调',
    preview: { bg: '#e8e2d6', active: '#5a4f6e' }
  },
  {
    key: 'pink',
    name: '档案玫瑰',
    description: '羊皮纸侧栏 + 玫瑰强调',
    preview: { bg: '#ece2d8', active: '#7a4f58' }
  },
  {
    key: 'amber',
    name: '档案赭石',
    description: '羊皮纸侧栏 + 赭石强调',
    preview: { bg: '#ece0d0', active: '#8b5a2b' }
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