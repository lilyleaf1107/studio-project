export type UserRole = 'owner' | 'admin' | 'staff'

export interface Profile {
  id: string
  name: string
  role: UserRole
  email?: string
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

export type TaskType = 'longterm' | 'shortterm' | 'temporary'
export type TaskStatus = 'todo' | 'doing' | 'review' | 'done' | 'delayed' | 'returned' | 'paused'
export type TaskPriority = 'high' | 'medium' | 'low'

export interface Task {
  id: string
  name: string
  type: TaskType
  task_category?: string
  big_project_id?: string
  sub_project_id?: string
  stage?: string
  assignee_id: string
  collaborator_ids?: string[]
  due_date: string
  priority: TaskPriority
  status: TaskStatus
  description?: string
  reviewer_id?: string
  reject_reason?: string
  created_at: string
  updated_at: string
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

export interface StageConfig {
  id: string
  key: string
  name: string
  enabled: boolean
  sort_order: number
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
