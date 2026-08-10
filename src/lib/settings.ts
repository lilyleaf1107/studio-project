export const DEFAULT_STAGES: { key: string; name: string }[] = [
  { key: 'requirement', name: '需求确认' },
  { key: 'design', name: '画图 / 设计' },
  { key: 'review', name: '审核 / 修改' },
  { key: 'test', name: '测试' },
  { key: 'manufacture', name: '加工' },
  { key: 'assembly', name: '装配' },
  { key: 'debug', name: '调试' },
  { key: 'acceptance', name: '验收' },
  { key: 'archive', name: '归档' }
]

export const TASK_CATEGORIES: { key: string; name: string }[] = [
  { key: 'drawing', name: '画图' },
  { key: 'design', name: '设计' },
  { key: 'test', name: '测试' },
  { key: 'manufacture', name: '加工' },
  { key: 'assembly', name: '装配' },
  { key: 'photo', name: '拍摄' },
  { key: 'listing', name: '上架' },
  { key: 'organize', name: '整理资料' },
  { key: 'assist', name: '协助' },
  { key: 'other', name: '其他' }
]

export const PROJECT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '未开始', color: 'bg-slate-100 text-slate-600' },
  active: { label: '进行中', color: 'bg-blue-50 text-blue-700' },
  paused: { label: '暂停', color: 'bg-amber-50 text-amber-700' },
  reviewing: { label: '待验收', color: 'bg-purple-50 text-purple-700' },
  completed: { label: '已完成', color: 'bg-emerald-50 text-emerald-700' },
  delayed: { label: '已延期', color: 'bg-red-50 text-red-700' },
  archived: { label: '已归档', color: 'bg-gray-100 text-gray-500' },
  blocked: { label: '等待前置', color: 'bg-orange-50 text-orange-700' }
}

export const TASK_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  todo: { label: '未开始', color: 'bg-slate-100 text-slate-600' },
  doing: { label: '进行中', color: 'bg-blue-50 text-blue-700' },
  review: { label: '待验收', color: 'bg-purple-50 text-purple-700' },
  done: { label: '已完成', color: 'bg-emerald-50 text-emerald-700' },
  delayed: { label: '已延期', color: 'bg-red-50 text-red-700' },
  returned: { label: '已退回', color: 'bg-orange-50 text-orange-700' },
  paused: { label: '暂停', color: 'bg-amber-50 text-amber-700' }
}

export const TASK_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  longterm: { label: '长线项目任务', color: 'bg-indigo-50 text-indigo-700' },
  shortterm: { label: '短线设计任务', color: 'bg-teal-50 text-teal-700' },
  temporary: { label: '临时普通任务', color: 'bg-pink-50 text-pink-700' }
}

export const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: '高', color: 'bg-red-50 text-red-700' },
  medium: { label: '中', color: 'bg-amber-50 text-amber-700' },
  low: { label: '低', color: 'bg-slate-100 text-slate-600' }
}

export const ROLE_LABELS: Record<string, string> = {
  owner: '老板',
  admin: '管理员',
  staff: '员工'
}
