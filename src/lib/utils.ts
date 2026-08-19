import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(d?: string | Date | null | undefined): string {
  if (d === undefined || d === null || d === '') return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDateTime(d: string | Date) {
  const date = typeof d === 'string' ? new Date(d) : d
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${formatDate(date)} ${h}:${min}`
}

export function todayEndOfDay() {
  const d = new Date()
  d.setHours(23, 59, 59, 0)
  return d.toISOString()
}

export function addDaysISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(23, 59, 59, 0)
  return d.toISOString()
}

export function isOverdue(due?: string | Date): boolean {
  if (due === undefined || due === null || due === '') return false
  return new Date(due).getTime() < Date.now()
}

export function shortId() {
  return Math.random().toString(36).slice(2, 10)
}

export function getCountdown(due?: string | Date, start?: string | Date): string {
  if (!due && !start) return ''

  const now = Date.now()

  if (start) {
    const startTime = typeof start === 'string' ? new Date(start).getTime() : start.getTime()
    if (now < startTime) {
      const diffMs = startTime - now
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      if (days > 0) return `⏳ 距开始还有 ${days} 天`
      const hours = Math.floor(diffMs / (1000 * 60 * 60))
      if (hours > 0) return `⏳ 距开始还有 ${hours} 小时`
      const minutes = Math.floor(diffMs / (1000 * 60))
      return `⏳ 距开始还有 ${minutes} 分钟`
    }
  }

  if (!due) return ''

  const dueTime = typeof due === 'string' ? new Date(due).getTime() : due.getTime()
  const diffMs = dueTime - now

  if (diffMs > 0) {
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    if (days > 0) {
      return `⏰ 剩余 ${days} 天 ${hours > 0 ? hours + ' 小时' : ''}`
    }
    if (hours > 0) {
      return `⏰ 剩余 ${hours} 小时`
    }
    if (minutes > 0) {
      return `⏰ 剩余 ${minutes} 分钟`
    }
    return `⏰ 即将到期`
  } else {
    const overdueMs = Math.abs(diffMs)
    const days = Math.floor(overdueMs / (1000 * 60 * 60 * 24))
    if (days > 0) {
      return `🔥 逾期 ${days} 天`
    }
    const hours = Math.floor(overdueMs / (1000 * 60 * 60))
    if (hours > 0) {
      return `🔥 逾期 ${hours} 小时`
    }
    return `🔥 已逾期`
  }
}
