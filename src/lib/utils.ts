import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(d: string | Date) {
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

export function isOverdue(due: string | Date) {
  return new Date(due).getTime() < Date.now()
}

export function shortId() {
  return Math.random().toString(36).slice(2, 10)
}
