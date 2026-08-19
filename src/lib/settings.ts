export const DEFAULT_STAGES: { key: string; name: string; isRepeatable?: boolean }[] = [
  { key: 'material', name: '整理资料' },
  { key: 'design', name: '设计画图' },
  { key: 'review', name: '审核修改' },
  { key: 'prototyping', name: '打样', isRepeatable: true },
  { key: 'testing', name: '测试', isRepeatable: true },
  { key: 'manufacture', name: '加工' },
  { key: 'assembly', name: '装配' },
  { key: 'acceptance', name: '验收' }
]

export const DEFAULT_STAGE_ORDER: string[] = DEFAULT_STAGES.map(s => s.key)

export const TASK_CATEGORIES: { key: string; name: string; isSystem: boolean }[] = [
  { key: 'huatu', name: '画图', isSystem: true },
  { key: 'yunying', name: '运营', isSystem: true },
  { key: 'meigong', name: '美工', isSystem: true },
  { key: 'paishe', name: '拍摄', isSystem: true },
  { key: 'sheji', name: '设计', isSystem: true },
  { key: 'ceshi', name: '测试', isSystem: true }
]

export const JOB_TITLE_PRESETS: string[] = ['技术', '库管', '运营', '美工', '设计', '销售', '其他']

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
  anytime: { label: '随时进行', color: 'bg-slate-100 text-slate-600' },
  normal: { label: '普通任务', color: 'bg-teal-50 text-teal-700' },
  longterm: { label: '长线任务', color: 'bg-indigo-50 text-indigo-700' },
  recurring: { label: '循环任务', color: 'bg-purple-50 text-purple-700' }
}

export const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: '高', color: 'bg-red-50 text-red-700' },
  medium: { label: '中', color: 'bg-amber-50 text-amber-700' },
  low: { label: '低', color: 'bg-slate-100 text-slate-600' }
}

export const PRIORITY_FLAGS: Record<string, string> = {
  high: '🔴',
  medium: '🟡',
  low: '🔵'
}

export const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  owner: '老板',
  staff: '员工'
}
