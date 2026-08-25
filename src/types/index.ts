/**
 * admin=经理(最高) | owner=老板 | partner=伙伴 | staff=员工
 */
export type UserRole = 'owner' | 'admin' | 'partner' | 'staff'

export interface Profile {
  id: string
  name: string
  role: UserRole
  email?: string
  job_title?: string
  created_at: string
}

export type ProjectStatus = 'pending' | 'active' | 'paused' | 'reviewing' | 'completed' | 'delayed' | 'archived'

export interface BigProject {
  id: string
  name: string
  code?: string
  owner_id: string
  start_date: string
  end_date: string
  status: ProjectStatus
  description?: string
  created_at: string
  updated_at: string
}

export type SubProjectStatus = 'pending' | 'active' | 'paused' | 'reviewing' | 'completed' | 'delayed' | 'blocked'

export interface SubProject {
  id: string
  big_project_id: string
  name: string
  owner_id: string
  stage?: string
  status: SubProjectStatus
  start_date?: string
  end_date?: string
  description?: string
  created_at: string
  updated_at: string
}

/**
 * anytime=随时任务 | normal=普通任务 | longterm=长期任务 | recurring=周期任务
 * @deprecated 旧类型 longterm/shortterm/temporary 已废弃
 */
export type TaskType = 'anytime' | 'normal' | 'longterm' | 'recurring'
export type TaskStatus = 'todo' | 'doing' | 'review' | 'done' | 'delayed' | 'returned' | 'paused'
/**
 * high=红旗(高) | medium=黄旗(中) | low=蓝旗(低)
 */
export type TaskPriority = 'high' | 'medium' | 'low'

export interface Task {
  id: string
  name: string
  type: TaskType
  /**
   * @deprecated 请使用 task_category_id 替代
   */
  task_category?: string
  task_category_id?: string
  start_date?: string
  recurrence_rule?: string
  round_number?: number
  big_project_id?: string
  sub_project_id?: string
  stage?: string
  assignee_id: string
  collaborator_ids?: string[]
  due_date?: string
  priority: TaskPriority
  status: TaskStatus
  description?: string
  reviewer_id?: string
  reject_reason?: string
  created_at: string
  updated_at: string
}

export interface TaskCategory {
  id: string
  name: string
  sort_order: number
  enabled: boolean
  is_system?: boolean
  created_at: string
}

export type RecordAction =
  | 'assign'
  | 'start'
  | 'submit'
  | 'upload'
  | 'stage_change'
  | 'approve'
  | 'reject'
  | 'delay_request'
  | 'delay_system'
  | 'comment'
  | 'create_project'
  | 'archive'

export interface WorkRecord {
  id: string
  created_at: string
  operator_id: string
  operator_name?: string
  big_project_id?: string
  sub_project_id?: string
  task_id?: string
  action: RecordAction
  content: string
  attachment_path?: string
}

// 个人日程事件（由 personal_todos 扩充而来）
export interface PersonalEvent {
  id: string
  user_id: string
  title: string
  done: boolean
  created_at: string
  event_date?: string
  start_time?: string
  end_time?: string
  recurrence_rule?: string
  color?: string
}

export interface StageConfig {
  id: string
  key: string
  name: string
  enabled: boolean
  sort_order: number
  is_repeatable?: boolean
}

export interface TaskTemplate {
  id: string
  key: string
  name: string
  task_category: string
  default_due_days?: number
  enabled: boolean
  sort_order: number
}
